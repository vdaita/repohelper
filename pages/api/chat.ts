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

    let {messages, repo, documents} = await req.json();

    if(repo == "mantine") {
        // console.log("Received Chat OpenAI request from frontend: ", messages, documents, repo);
        let trimmedMessages = messages.slice(-4);
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
                {role: "system", content: `You are a helpful coding assistant that uses Markdown to provide the best possible answer to the user based on your provided documentation and other knowledge. 
                Your answers should be focused on using the ${repo} library and tools. If you do not have the information required to provide an answer, state that you do not have the information required to produce a response.
                Do not provide any answers or information that cannot be supported by the documentation provided.`}, 
                {role: "system", content: `Documentation: ${documentsString}`},
                ...trimmedMessages
            ]
        });

        const stream = OpenAIStream(response);
        return new StreamingTextResponse(stream);
    } else {
        
    }
}

export const runtime = 'edge';