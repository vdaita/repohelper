import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { createClient } from "@supabase/supabase-js";
import { HuggingFaceEmbeddings, HuggingFaceInferenceEmbeddings } from "langchain/embeddings/hf";
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { RetrievalQAChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai"
// import { StreamingTextResponse, LangChainStream, Message } from 'ai';
import { AIMessage, HumanMessage, SystemMessage } from 'langchain/schema';

import { Configuration, OpenAIApi } from 'openai-edge';
import { OpenAIStream, StreamingTextResponse } from 'ai';

async function LangchainStream(chain, message) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let counter = 0;
    try {
        const res = await chain.call({query: message});

        const stream = new ReadableStream({
            async start(controller) {
                // callback
                function onParse(event) {
                    if (event.type === "event") {
                        const data = event.data;

                        if (data === "[DONE]") {
                        controller.close();
                        return;
                        }
                        try {
                        const json = JSON.parse(data);
                        const text = json.choices[0].delta?.content || "";
                        if (counter < 2 && (text.match(/\n/) || []).length) {
                            // this is a prefix character (i.e., "\n\n"), do nothing
                            return;
                        }
                        const queue = encoder.encode(text);
                        controller.enqueue(queue);
                        counter++;
                        } catch (e) {
                        // maybe parse error
                        controller.error(e);
                        }
                    }
                }

                // stream response (SSE) from OpenAI may be fragmented into multiple chunks
                // this ensures we properly read chunks and invoke an event for each SSE event stream
                const parser = createParser(onParse);
                // https://web.dev/streams/#asynchronous-iteration
                for await (const chunk of res.body) {
                    parser.feed(decoder.decode(chunk));
                }
            },
        });

        return stream;
    } catch (err) {
        console.log("Error with chain being called: ", err);
        return JSON.stringify({error: err.toString()});
    }
}

export default async function handler(req){
    console.log("received request");
    try {
        const {jwt, messages} = await req.json();
        // const { stream, handlers } = LangChainStream();
        
        console.log("received request: ", jwt, messages);
    
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
            headers: {
                apiKey: process.env.SUPABASE_KEY,
                Authorisation: `Bearer ${jwt}`
            }
        })

        console.log("supabase client: ", supabase.rpc);
    
        // const embeddings = new HuggingFaceInferenceEmbeddings({model: "Salesforce/codet5p-110m-embedding", apiKey: process.env.HF_API_KEY})
        const embeddings = new OpenAIEmbeddings({openAIApiKey: process.env.OPENAI_API_KEY, modelName: "text-embedding-ada-002"});

        // const vectorStore = await SupabaseVectorStore.fromExistingIndex(
        //     embeddings,
        //     {
        //         supabase,
        //         tableName: "documents",
        //         queryName: "match_documents"
        //     }
        // );
    
        // const model = new ChatOpenAI({modelName: "gpt-3.5-turbo", maxTokens: 500, streaming: true, openAIApiKey: process.env.OPENAI_API_KEY})
        // const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), {
        //     returnSourceDocuments: true
        // });
    
        // let formattedMessages = messages.map(m => 
        //     m.sender == 'user' ?
        //     new HumanMessage(m.message) 
        //     : new AIMessage(m.message)
        // );

        // console.log("embeddings, vectorStore, model, chain, all loaded, with messages: ", formattedMessages);
    
        console.log("loaded info")

        let initialMessage = new SystemMessage(`You are a helpful programming assistant that looks through documentation to answer questions. 
        Respond in Markdown to each question with code snippets included if needed.`);

        queryText = queryText.reoplace

        let embeddedQuestion = embeddings.embedQuery("");

        // let stream = LangchainStream(chain, queryText);
    
        // stream the response back ro something
        // return new StreamingTextResponse(stream);
        return new Response(stream);
    } catch (err) {
        console.error("Sending error:", err);
        return new Response(JSON.stringify({"error": err.toString()}), {headers: {statusCode: 500}});
    }
}

export const runtime = 'edge';