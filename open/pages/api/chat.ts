import { StreamingTextResponse, LangChainStream, Message } from 'ai'
import { ChatOpenAI } from 'langchain/chat_models/openai'
import { HuggingFaceInferenceEmbeddings } from 'langchain/embeddings/hf';
import { HuggingFaceInference } from 'langchain/llms/hf';
import { AIMessage, HumanMessage } from 'langchain/schema'
import { createClient } from '@supabase/supabase-js'
import { RetrievalQAChain } from 'langchain/chains';

export const runtime = 'edge'

async function embedQueryHF(query: string){
  console.log("Starting the HuggingFace Embeddings request");
  let apiUrl = `https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2`;
  let headers = {"Authorization": `Bearer ${process.env.HF_API_KEY}`}
  let res = await fetch(apiUrl, {
    headers: headers,
    body: JSON.stringify({
      inputs: [query],
      options: {
        wait_for_model: true
      }
    }),
    method: "POST"
  });
  let json = await res.json();
  return json[0];
}

async function embedQueryOpenAI(query: string){
  console.log("Starting the OpenAI Embeddings request");
  
}

export default async function POST(req: Request) {

  console.log("POST request");

  let reqJson = await req.json();

  let messages = reqJson['messages'];
  let repo = reqJson['repo'];

  console.log("Request bodies: ", reqJson, messages, repo);

  console.log("Received request: ", reqJson);
  let HF_API_KEY = process.env.HF_API_KEY;
 
  // const { stream, handlers } = LangChainStream()

  let supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_KEY!);

  const embeddings = new HuggingFaceInferenceEmbeddings({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    apiKey: HF_API_KEY
  });
 
  // const llm = new ChatOpenAI({
  //   streaming: true
  // })
 
  const llm = new HuggingFaceInference({
    apiKey: HF_API_KEY,
    model: 'vdaita/Replit-v1-CodeInstruct-3B-8bit'
  });

  let userQuery = messages; // later, when there are more messages, switch to messages.at(-1)

  let embeddedQuestion = await embedQueryHF(userQuery);

  console.log("Finished embedding the question: ", embeddedQuestion);

  let { data: matches, error: matchError} = await supabaseClient.rpc('match_documents', {
    query_embedding: embeddedQuestion,
    match_count: 3,
    match_threshold: 0.78,
    repo: repo
  })

  // TODO: handle error
  if(matchError){

    console.log("Match error: ", matchError);

    return new Response(JSON.stringify({"error": "Error"}));
  }

  console.log("Matched documents: ", matches, matchError);

  let documentation = "";
  for(var i = 0; i < matches.length; i++){
    documentation += matches[i]['content'];
  }


  let prompt = `You are a helpful coding assistant that will look at documentation and answer the user's question according to the documentation using Markdown format.
   Documentation: ${documentation} \n Question: ${userQuery}`


  let response = await llm.call(prompt);

  return new Response(JSON.stringify({"response": response}));
}