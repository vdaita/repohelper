import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { createClient } from "@supabase/supabase-js";
import { HuggingFaceHubEmbeddings } from "langchain/embeddings/hf";
import { RetrievalQAChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/"

export default async function handler(req){

    const {jwt, message, chatHistory} = await req.json();

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
        headers: {
            apiKey: process.env.ANON_KEY,
            Authorisation: `Bearer ${jwt}`
        }
    })

    const embeddings = new HuggingFaceHubEmbeddings(repo_id="bigcode/starcoder", huggingfacehub_api_token=process.env.HUGGING_FACE_API_KEY)

    const vectorStore = await SupabaseVectorStore.fromExistingIndex(
        embeddings,
        {
            supabase,
            tableName: "documents",
            queryName: "match_documents"
        }
    );

    const model = new ChatOpenAI({modelName: "gpt-4"})
    const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), {
        returnSourceDocuments: true
    });

    const response = await chain.call({
        query: "?"
    })

    // stream the response back ro something
}

// export const runtime = 'edge';