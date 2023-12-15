import { StreamingTextResponse, OpenAIStream, LangChainStream, Message } from 'ai'
import OpenAI from 'openai';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { convert } from 'html-to-text';
import { PromptTemplate } from 'langchain/prompts';
import { loadQAMapReduceChain } from 'langchain/chains';
import { TokenTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { SystemMessage, HumanMessage, AIMessage } from 'langchain/schema';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { ReplicateEmbeddings } from './replicate_embeddings';

const lc_llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    maxTokens: 512
});

const embeddings = new ReplicateEmbeddings({});
const supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const GENERATE_MESSAGES_PROMPT = ` 
You a question-answering assistant. Based on the user's current query and the previous chat history, generate three subquestions that can be asked against a vectorstore.
These three subquestions should be as specific as possible. Separate these questions with newlines and output nothing else.
`;

function iteratorToStream(iterator: any) {
    return new ReadableStream({
      async pull(controller) {
        const { value, done } = await iterator.next()
   
        if (done) {
          controller.close()
        } else {
          controller.enqueue(value)
        }
      },
    })
}

async function get_website_content(website: string, question: string){
    const website_result = await fetch(website);
    const content = await website_result.text();

    const splitter = new TokenTextSplitter({
        chunkSize: 10000,
        chunkOverlap: 1000
    });
    const contentDocument = new Document({
        pageContent: content
    });

    let splitDocuments = splitter.splitDocuments([contentDocument]);

    const summarizationChain = loadQAMapReduceChain(lc_llm);

    let response = await summarizationChain.call({
        input_documents: splitDocuments,
        question: question
    });

    console.log(response);

    return JSON.stringify(response);
}
   
const encoder = new TextEncoder()

async function* makeIterator(messages: any[], uid: string) {

    // generate k questions
    let prevConvo = "";
    for(var i = 0; i < messages.length - 1; i++){
        prevConvo += messages[i]["role"] + ": " + messages[i]["content"];
    }
    // Use map reduce or a context window to make sure this stays under the token limit

    let currentQuestion = messages.at(-1)["content"];

    let messageHistory = `Chat history: \n ${prevConvo} \n \n \n Current question: ${currentQuestion} \n \n Subquestions:`;
    let subquestions = (await lc_llm.call([new SystemMessage({content: GENERATE_MESSAGES_PROMPT}), new HumanMessage({content: messageHistory})])).content;

    console.log("Generated questions: ", subquestions);
    yield encoder.encode(`**Generated questions:** ${subquestions} \n`);

    let splitQuestions = subquestions.split("\n");

    let vectorstore = new SupabaseVectorStore(embeddings, {
        client: supabaseClient,
        tableName: "documents",
        queryName: "match_documents",
        filter: {
            uid: uid
        }
    });
    
    let documents: Document[] = [];

    for(var i = 0; i < splitQuestions.length; i++){
        let newDocuments = await vectorstore.similaritySearch(splitQuestions[i], 3);
        let uniqueDocuments = [];
        for(var j = 0; j < newDocuments.length; j++){
            var flag = true;
            for(var k = 0; k < documents.length; k++){
                if(documents[k].pageContent === newDocuments[j].pageContent){
                    flag = false;
                    break;
                }
            }
            
            if(flag){
                uniqueDocuments.push(newDocuments[j]);
            }
        }

        documents = [...documents, ...uniqueDocuments];
    }

    let formattedDocumentationString = ""; 

    // get the relevant documents
    const stream = await lc_llm.stream([])

    for await (const chunk of stream) {
        console.log("Printing out chunk: ", chunk?.content); 
        yield encoder.encode(chunk?.content || '');
    }
}

export async function POST(req: Request) {
    let body = req.json();
    
    const iterator = makeIterator()
    const stream = iteratorToStream(iterator)

    return new Response(stream)
}

export const runtime = 'edge';