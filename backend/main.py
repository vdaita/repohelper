# probably should rewrite this using Next.js

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
import tempfile
import os
from langchain.docstore.document import Document
from langchain.document_loaders import GitLoader, UnstructuredURLLoader
from langchain.embeddings import HuggingFaceHubEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from stackapi import StackAPI

import json

class RequestItem(BaseModel):
    uid: str
    data: str
    type: str
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

@app.post("/add_data/")
async def add_data(item: RequestItem):
    # Load data using various methods

    supabase: Client = create_client(url, key, {
        'headers': {
            'apiKey': key,
            'Authorization': 'Bearer ' + item.jwt
        }
    })

    embeddings_model = HuggingFaceHubEmbeddings(repo_id="bigcode/starcoder", 
                                                huggingfacehub_api_token=os.environ.get("HF_API_KEY"))
    sources_table_data = supabase.table("sources").insert({
        "uid": item.uid,
        "data": item.data,
        "type": item.type,
        "completed": False 
    }).execute();

    # add further integrations (documentation - GitBook/ReadTheDocs/Apify, custom integrations - getting most liked StackOverflow questions)

    data = []

    if item.type == "github":
        tmp_dir = tempfile.TemporaryDirectory()
        req_data = json.loads(item.data)

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

        tmp_dir.cleanup()
    elif item.type == "url":
        req_data = json.loads(item.data)
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
            
    elif item.type == "text":
        req_data = json.loads(item.data)
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