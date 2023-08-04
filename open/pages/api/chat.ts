import { StreamingTextResponse, LangChainStream, Message } from 'ai'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { HuggingFaceEmbeddings } from 'langchain/embeddings/hf';
import { AIMessage, HumanMessage } from 'langchain/schema'
import { SupabaseVectorStore } from "langchain/vectorstore/supabase"; 
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
 
export async function POST(req: Request) {
  const { messages } = await req.json()
 
  const { stream, handlers } = LangChainStream()

  let supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
 
  const llm = new ChatOpenAI({
    streaming: true
  })
 
  llm
    .call(
      (messages as Message[]).map(m =>
        m.role == 'user'
          ? new HumanMessage(m.content)
          : new AIMessage(m.content)
      ),
      {},
      [handlers]
    )
    .catch(console.error)
 
  return new StreamingTextResponse(stream)
}