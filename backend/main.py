# probably should rewrite this using Next.js

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from supabase import create_client, Client
import tempfile
import shutil
import os
from dotenv import load_dotenv
from langchain.docstore.document import Document
from langchain.document_loaders import GitLoader, GitHubIssuesLoader, ReadTheDocsLoader, UnstructuredURLLoader
from langchain.embeddings import HuggingFaceHubEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from stackapi import StackAPI

from langchain.callbacks import AsyncIteratorCallbackHandler
from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage, AIMessage
from langchain.chains import RetrievalQAWithSourcesChain
from langchain.vectorstores import SupabaseVectorStore

from typing import AsyncIterable, Awaitable
import asyncio
import json

load_dotenv()

class AddModelRequestItem(BaseModel):
    uid: str
    data: str
    request_type: str
    jwt: str

class ChatItem(BaseModel):
    model: str
    messages: list
    jwt: str

origins = [
    "http://repohelper.longlaketech.com",
    "https://repohelper.longlaketech.com",
    "http://localhost",
    "http://localhost:8080"
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")


stackoverflow_site = StackAPI('stackoverflow') # should I allow users to add all information from this

def create_chain(jwt):
    supabase: Client = create_client(url, key, {'headers': {'Authorization': 'Bearer ' + jwt}})

    embeddings_model = HuggingFaceHubEmbeddings(repo_id="replit/replit-code-v1-3b", 
                                                huggingfacehub_api_token=os.getenv("HF_API_KEY"))

    vector_store = SupabaseVectorStore(
        client=supabase,
        embedding=embeddings_model,
        table_name="documents",
        query_name="match_documents"
    )

    model = ChatOpenAI(
        streaming=True,
        verbose=True,
        openai_api_key=os.getenv('OPENAI_API_KEY')
    )

    chain = RetrievalQAWithSourcesChain.from_llm(model, vector_store.as_retriever())
    return chain

async def send_message(messages: list, jwt: str) -> AsyncIterable[str]:
    callback = AsyncIteratorCallbackHandler()
    chain = create_chain(jwt)

    async def wrap_done(fn: Awaitable, event: asyncio.Event):
        """Wrap an awaitable with a event to signal when it's done or an exception is raised."""
        try:
            await fn
        except Exception as e:
            # TODO: handle exception
            print(f"Caught exception: {e}")
        finally:
            # Signal the aiter to stop.
            event.set()

    formatted_messages = []
    for message in messages:
        if message.sender == 'user':
            formatted_messages.append(HumanMessage(content=message))
        else:
            formatted_messages.append(AIMessage(content=message))

    # Begin a task that runs in the background.
    task = asyncio.create_task(wrap_done(
        chain.acall(messages=[[HumanMessage(content=message)]]),
        callback.done),
    )

    async for token in callback.aiter():
        # Use server-sent-events to stream the response
        yield f"data: {token}\n\n"

    await task

class ChatRequest(BaseModel):
    messages: list
    jwt: str

@app.post("/chat")
def chat(body: ChatRequest):
    return StreamingResponse(send_message(body.messages, body.jwt), media_type="text/event-stream")

@app.post("/add_data/")
async def add_data(item: AddModelRequestItem):
    # Load data using various methods

    supabase: Client = create_client(url, key, {
        'headers': {
            'apiKey': key,
            'Authorization': 'Bearer ' + item.jwt
        }
    })

    embeddings_model = HuggingFaceHubEmbeddings(repo_id="replit/replit-code-v1-3b", 
                                                huggingfacehub_api_token=os.environ.get("HF_API_KEY"))
    sources_table_data = supabase.table("sources").insert({
        "uid": item.uid,
        "data": item.data,
        "request_type": item.request_type,
        "completed": False 
    }).execute();

    req_data = json.loads(item.data)

    # add further integrations (documentation - GitBook/ReadTheDocs/Apify, custom integrations - getting most liked StackOverflow questions)

    data = []

    if item.request_type == "git":
        tmp_dir = tempfile.mkdtemp()
        loader = GitLoader(
            clone_url=req_data.url,
            repo_path = tmp_dir,
            branch=req_data.branch
        )

        documents = loader.load()    
        embeddings = embeddings_model.embed_documents(documents)
        
        for (index, document) in enumerate(documents):
            data.append({ "embeddings": embeddings[index],
                          "uid": item.uid,  
                          "source_id": sources_table_data.data.id, 
                          "url": req_data.url + "/tree/" + req_data.branch + "/" + document.metadata['file_path'],
                        "snippet": ""
            })

        shutil.rmtree(tmp_dir)

    elif item.request_type == "rtdocs":
        tmp_dir = tempfile.mkdtemp()
        os.system("wget -r -A.html -P " + tmp_dir + " " + req_data['url'])
        loader = ReadTheDocsLoader(tmp_dir, features="html.parser")

        documents = loader.load()
        embeddings = embeddings_model.embed_documents(documents)

        for (index, documents) in enumerate(documents):
            # figure out the outputs on this one
            data.append({

            })
        
    elif item.request_type == "url":
        loader = UnstructuredURLLoader(urls=[req_data['url']])
        documents = loader.load()
        # split the document into several pieces 
        text_splitter = RecursiveCharacterTextSplitter()
        split_documents = text_splitter.create_documents([documents])

        embeddings = embeddings_model.embed_documents(split_documents)

        for (index, document) in enumerate(split_documents):
            data.append({ "embeddings": embeddings,
                        "uid": item.uid,
                        "source_id": sources_table_data.data.id,
                        "url": req_data["url"],
                        "snippet": document.page_content
                        })
            
    elif item.request_type == "text":
        document = Document({'page_content': req_data['text']})
        text_splitter = RecursiveCharacterTextSplitter()
        split_documents = text_splitter.create_documents([document])
        embeddings = embeddings_model.embed_documents(split_documents)

        for (index, document) in enumerate(split_documents):
            data.append({
                "embeddings": embeddings,
                "uid": item.uid,
                "source_id": sources_table_data.data.id,
                "url": req_data["url"],
                "snippet": document.page_content
            })

    supabase.table("documents").insert(data)
    updates_source_table_data = supabase.table("sources").insert({"completed": True})

    return {"message": "success"}