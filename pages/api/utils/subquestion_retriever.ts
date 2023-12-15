import { ChatOpenAI } from 'langchain/chat_models/openai';
import { VectorStore } from 'langchain/dist/vectorstores/base';
import { Document } from 'langchain/document';
import { SystemMessage, HumanMessage } from 'langchain/schema';

const GENERATE_SUBQUESTIONS_PROMPT = ` 
You a question-answering assistant. Based on the user's current query and the previous chat history, generate three subquestions that can be asked against a vectorstore.
These three subquestions should be as specific as possible. Separate these questions with newlines and output nothing else.
`; // integrate this into a question retriever

let generateQuestion = async (currentQuestion: string, vectorstore: VectorStore) => {
    const lc_llm = new ChatOpenAI();

    let messageHistory = `Current question: ${currentQuestion} \n \n Subquestions:`;
    let subquestions = (await lc_llm.call([new SystemMessage({content: GENERATE_SUBQUESTIONS_PROMPT}), new HumanMessage({content: messageHistory})])).content;
    let splitQuestions = subquestions.split("\n");

    let documents: Document[] = [];

    for(var i = 0; i < splitQuestions.length; i++){
        let newDocuments = await vectorstore.similaritySearch(splitQuestions[i], 3);
        let uniqueDocuments = [];
        for(var j = 0; j < newDocuments.length; j++){
            var flag = true;
            for(var k = 0; k < documents.length; k++){
                if(documents[k].pageContent === newDocuments[j].pageContent){
                    flag = false;
                    break;
                }
            }
            
            if(flag){
                uniqueDocuments.push(newDocuments[j]);
            }
        }

        documents = [...documents, ...uniqueDocuments];
    }
}