import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { createClient } from "@supabase/supabase-js";
import { HuggingFaceHubEmbeddings } from "langchain/embeddings/hf";
import { RetrievalQAChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/"
import { StreamingTextResponse, LangChainStream, Message } from 'ai';
import { AIMessage, HumanMessage } from 'langchain/schema';

export default async function handler(req){

    const {jwt, chatHistory} = await req.json();
    const { stream, handlers } = LangChainStream()

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
        headers: {
            apiKey: process.env.SUPABASE_KEY,
            Authorisation: `Bearer ${jwt}`
        }
    })

    const embeddings = new HuggingFaceHubEmbeddings(repo_id="replit/replit-code-v1-3b", huggingfacehub_api_token=process.env.HF_API_KEY)

    const vectorStore = await SupabaseVectorStore.fromExistingIndex(
        embeddings,
        {
            supabase,
            tableName: "documents",
            queryName: "match_documents"
        }
    );

    const model = new ChatOpenAI({modelName: "gpt-3.5-turbo", streaming: true})
    const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), {
        returnSourceDocuments: true
    });

    chain.call(
        chatHistory.map(m => 
            m.sender == 'user' ?
            new HumanMessage(m.message) 
            : new AIMessage(m.message)
        ),
        {},
        [handlers]
    )
    .catch(console.error)

    // stream the response back ro something
    return new StreamingTextResponse(stream);
}

export const runtime = 'edge';