import { StreamingTextResponse, OpenAIStream, LangChainStream, Message } from 'ai'
import { BaseMessage } from 'langchain/schema';
import { PromptTemplate } from 'langchain/prompts';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { RunnablePassthrough, RunnableSequence } from 'langchain/schema/runnable';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { CustomListOutputParser, ListOutputParser } from "langchain/output_parsers";

export const runtime = 'edge';

const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY
});

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY
})

const list_parser = new CustomListOutputParser({length: 3, separator: "\n"});

const condenseQuestionTemplate = `Given the following conversation and a follow up question, rephrase the follow-up question to be a standalone question, in its original language.
Chat History: 
{chat_history}

Follow Up Input:
{question}

Standalone question:`;

const CONDENSE_QUESTION_PROMPT = PromptTemplate.fromTemplate(
  condenseQuestionTemplate
);

const splitQuestionTemplate = `Given the following question, generate three separate questions that will make it easier for relevant data retrieval through. 
\Question: \n {question}
Format instructions: \n${list_parser.getFormatInstructions()}`

const SPLIT_QUESTION_TEMPLATE = PromptTemplate.fromTemplate(
  splitQuestionTemplate
)

const formatChatHistory = (messages: BaseMessage[]) => {
  let chatHistory = "";
  for(var i = 0; i < messages.length; i++){
    chatHistory += `${messages[i].name}: ${messages[i].content}\n`;
  }
  return chatHistory;
}

type ChainInput = {
  question: string;
  chat_history: string;
};

export default async function POST(req: Request) {
  let reqJson = await req.json();
  let messages = reqJson.messages;

  let lastQuestion = messages[-1].content;
  let chatHistory = messages.splice(0, messages.length - 1);
  
  // Generate the standalone questions
  const standaloneQuestionChain = RunnableSequence.from([
    {
      question: (input: ChainInput) => input.question,
      chat_history: (input: ChainInput) => input.chat_history
    }
  , CONDENSE_QUESTION_PROMPT, model, list_parser]);

  // Split the questions
  const splitQuestionChain = RunnableSequence.from([{
      question: new RunnablePassthrough()
  }, SPLIT_QUESTION_TEMPLATE, model, new StringOutputParser()]);
  
  const questionGenerationChain = standaloneQuestionChain.pipe(splitQuestionChain);

  const formattedChatHistory = formatChatHistory(chatHistory);

  // Embed the question
  const result = await questionGenerationChain.invoke({
    question: lastQuestion,
    chat_history: formattedChatHistory
  });

  let questions = [];

  // Retrieve the information from Supabase
  for(var i = 0; i < result.length; i++){
    let embeddedQuestion = await embeddings.embedQuery(result[i]);
    questions.push({
      question: result[i],
      embeddings: embeddedQuestion
    });
  }

  return new Response(JSON.stringify(questions));
}