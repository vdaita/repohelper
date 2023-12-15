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

const GENERATE_SUBQUESTIONS_PROMPT = ` 
You a question-answering assistant. Based on the user's current query and the previous chat history, generate three subquestions that can be asked against a vectorstore.
These three subquestions should be as specific as possible. Separate these questions with newlines and output nothing else.
`;

const GENERATE_COMBINED_QUESTION_PROMPT = `
Using the chat history and the current query, generate a single question that sums up the entirety of the question the user is asking.
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

    let messageHistory = `Chat history: \n ${prevConvo} \n \n \n Current question: ${currentQuestion}`;
    let subquestions = (await lc_llm.call([
        new SystemMessage({content: GENERATE_SUBQUESTIONS_PROMPT}), 
        new HumanMessage({content: `${messageHistory} \n \n Subquestions:`})
    ])).content;

    let combinedQuestion = (await lc_llm.call([
        new SystemMessage({content: GENERATE_COMBINED_QUESTION_PROMPT}),
        new HumanMessage({content: `${messageHistory} \n \n Combined question: `})
    ])).content;

    console.log("Generated combined question: ", combinedQuestion);

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
        console.log("Adding unique documents: ", uniqueDocuments);
        documents = [...documents, ...uniqueDocuments];
    }

    let formattedDocumentationString = ""; 
    for(var i = 0; i < documents.length; i++){
        if(documents[i].metadata.hasOwnProperty('url')){
            formattedDocumentationString += `\n Document from source ${documents[i].metadata["url"]}: \n ${documents[i].pageContent}`
        }
        formattedDocumentationString += `\n Document: ${documents[i].pageContent}`
    }

    // get the relevant documents
    const stream = await lc_llm.stream([
        new SystemMessage("You are a helpful programming assistant that analyzes documentation and provides the most relevant response according to the user's query. If you don't know how to solve a problem, say 'I don't know.'"),
        new HumanMessage(formattedDocumentationString.length > 0 ? `Documentation: \n ${formattedDocumentationString}` : "There is no documentation available for this question."),
        new HumanMessage(`Question: ${combinedQuestion}`)
    ])

    for await (const chunk of stream) {
        console.log("Printing out chunk: ", chunk?.content); 
        yield encoder.encode(chunk?.content || '');
    }
}

export async function POST(req: Request) {
    let body = await req.json();
    
    const iterator = makeIterator(body.messages, body.uid)
    const stream = iteratorToStream(iterator)

    return new Response(stream)
}

export const runtime = 'edge';