import { StreamingTextResponse, LangChainStream, Message } from 'ai'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { HuggingFaceInferenceEmbeddings } from 'langchain/embeddings/hf';
import { HuggingFaceInference } from 'langchain/llms/hf';
import { AIMessage, HumanMessage } from 'langchain/schema'
import { createClient } from '@supabase/supabase-js'
import { RetrievalQAChain } from 'langchain/chains';

export const runtime = 'edge'
 
export async function POST(req: Request) {

  const { messages } = await req.json()

  console.log("Received messages: ", messages);
  let HF_API_KEY = process.env.HF_API_KEY;
 
  // const { stream, handlers } = LangChainStream()

  let supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE)

  const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: HF_API_KEY
  });
 
  // const llm = new ChatOpenAI({
  //   streaming: true
  // })
 
  const llm = new HuggingFaceInference({
    apiKey: HF_API_KEY,
    model: '/replit-'
  });

  let userQuery = messages.at(-1);

  let embeddedQuestion = await embeddings.embedQuery(messages.at(-1));

  let { data: matches, error: matchError} = supabaseClient.rpc('match_documents', {
    embeddedQuestion,
    match_count: 3,
    match_threshold: 0.78
  })

  // TODO: handle error
  if(matchError){
    return new Response(JSON.stringify({"error": "Error"}));
  }

  console.log("Matched documents: ", matches, matchError);

  let documentation = "";
  for(var i = 0; i < matches.length; i++){
    documentation += matches[i]['content'];
  }


  let prompt = `You are a helpful coding assistant that will look at documentation and answer the user's question according to the documentation using Markdown format. Documentation: ${documentation} \n Question: ${userQuery}`


  let response = await llm.call(prompt);

  return new Response(JSON.stringify({"response": response}));
}