import { StreamingTextResponse, OpenAIStream, LangChainStream, Message } from 'ai'
import { Configuration, OpenAIApi } from 'openai-edge';
// import { ChatOpenAI } from 'langchain/chat_models/openai'
import { HuggingFaceInferenceEmbeddings } from 'langchain/embeddings/hf';
import { Replicate } from 'langchain/llms/replicate';
import { HuggingFaceInference } from 'langchain/llms/hf';
import { AIMessage, HumanMessage, SystemMessage } from 'langchain/schema'
import { createClient } from '@supabase/supabase-js';
import FrontendMessage from '../../utils/FrontendMessage';
import { RetrievalQAChain } from 'langchain/chains';

export const runtime = 'edge';

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(config);


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
  console.log(json);
  return json[0];
}


async function embedQueryOpenAI(query: string){
  console.log("Starting the OpenAI Embeddings request");
  let embedding = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: query
  });
  let json = await embedding.json();
  return json["data"][0]["embedding"];
}

export default async function POST(req: Request) {

  console.log("POST request");

  let reqJson = await req.json();
  reqJson = JSON.parse(reqJson);


  let messages = reqJson['messages'];
  let repo = reqJson['repo'];

  console.log("Request bodies: ", reqJson, typeof reqJson, messages, repo);

  console.log("Received request: ", reqJson);
  let HF_API_KEY = process.env.HF_API_KEY;
 
  // const { stream, handlers } = LangChainStream()

  let supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_KEY!);

  // const embeddings = new HuggingFaceInferenceEmbeddings({
  //   model: 'sentence-transformers/all-MiniLM-L6-v2',
  //   apiKey: HF_API_KEY
  // });
 
  let userQuery = messages.at(-1)["content"]; // later, when there are more messages, switch to messages.at(-1)
  // let embeddedQuestion = await embedQueryHF(userQuery);
  // let embeddedQuestion = await embeddings.embedQuery(userQuery);

  let embeddedQuestion = await embedQueryOpenAI(userQuery);

  console.log("Finished embedding the question: ", embeddedQuestion);

  let rpcQueryBody = {
    query_embedding: embeddedQuestion,
    match_count: 3,
    match_threshold: 0.78,
    repo: repo
  };

  console.log("RPC query body: ", rpcQueryBody);

  let { data: matches, error: matchError} = await supabaseClient.rpc('match_documents', rpcQueryBody)

  // TODO: handle error
  if(matchError){

    console.log("Match error: ", matchError);

    return new Response(JSON.stringify({"documents": [], "error": "Error"}));
  }

  console.log("Matched documents: ", matches, matchError);

  // let documentation = "";
  // for(var i = 0; i < matches.length; i++){
  //   documentation += matches[i]['content'];
  // }

  return new Response(JSON.stringify({"documents": matches}));
}