import { StreamingTextResponse, OpenAIStream, LangChainStream, Message } from 'ai'
import OpenAI from 'openai';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { convert } from 'html-to-text';
import { PromptTemplate } from 'langchain/prompts';
import { loadQAMapReduceChain } from 'langchain/chains';
import { TokenTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';
import { ChatOpenAI } from 'langchain/chat_models/openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

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

    const llm = new ChatOpenAI();

    const summarizationChain = loadQAMapReduceChain(llm);

    let response = await summarizationChain.call({
        input_documents: splitDocuments,
        question: question
    });

    console.log(response);

    return JSON.stringify(response);
}
   
const encoder = new TextEncoder()

async function* makeIterator() {
    const stream = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages: [],
        stream: true
    });

    for await (const chunk of stream) {
        if(chunk.choices[0]?.delta?.function_call){
            // If there is a call to retrieve more information from a website, retrieve it and return it to the LLM.
        }
        console.log("Printing out chunk: ", chunk.choices[0]?.delta?.content); 
        yield encoder.encode(chunk.choices[0]?.delta?.content || '');
    }
}

export async function GET() {
    const iterator = makeIterator()
    const stream = iteratorToStream(iterator)

    return new Response(stream)
}

export const runtime = 'edge';