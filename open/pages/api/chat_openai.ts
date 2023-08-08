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

const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
  });
  const openai = new OpenAIApi(config);

export default async function handler(req: Request) {
    const {messages, documents} = await req.json();

    let documentsString = "";
    for(var i = 0; i < documents.length; i++){
        documentsString += documents[i]["content"];
        documentsString += "\n";
    }
    
    // right now everything should be submitted in the of a well formatted list
    const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        stream: true,
        messages: [
            {role: "system", content: "You are a helpful coding assistant."}, 
            {role: "system", content: `Documentation: ${documentsString}`},
            ...messages
        ]
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
}