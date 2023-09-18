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

    // console.log("handler request", req, req.body);
    console.log("Handler request");

    try {
        let {messages, documentationString} = await req.json();

        // console.log("Received Chat OpenAI request from frontend: ", messages, documents, repo);
        let trimmedMessages = messages.slice(-4);
    
        // right now everything should be submitted in the of a well formatted list
        const response = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo-16k',
            stream: true,
            messages: [
                {role: "system", content: `You are a helpful coding assistant that uses Markdown to provide the best possible answer to the user based on your provided documentation and other knowledge. 
                If you do not have the information required to provide an answer, state that you do not have the information required to produce a response.
                Do not provide any answers or information that cannot be supported by the documentation provided. Be concise.`}, 
                ...trimmedMessages
            ]
        });
    
        const stream = OpenAIStream(response);
        return new StreamingTextResponse(stream);
    } catch (e) {
        console.error(e);
        return new Response("There is an error obtaining a result.");
    }
}

export const runtime = 'edge';