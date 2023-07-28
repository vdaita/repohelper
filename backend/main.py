from fastapi import FastAPI
from pydantic import BaseModel
from supabase import create_client, Client
import tempfile
import os
from langchain.document_loaders import GitLoader, UnstructuredURLLoader
from langchain.embeddings import HuggingFaceHubEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
import json

class RequestItem(BaseModel):
    uid: str
    data: str,
    type: str

app = FastAPI()
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SUDO_KEY")

supabase: Client = create_client(url, key)

@app.post("/add_data/")
async def add_data(item: RequestItem):
    # Load data using various methods

    embeddings_model = HuggingFaceHubEmbeddings(repo_id="bigcode/starcoder", 
                                                huggingfacehub_api_token=os.environ.get("HUGGING_FACE_EMBEDDINGS"))

    if item.type == "github":

        tmp_dir = tempfile.TemporaryDirectory()
        req_data = json.parse(item.data)

        loader = GitLoader(
            clone_url=req_data.url,
            repo_path = tmp_dir,
            branch=req_data.branch
        )

        documents = loader.load()    
        embeddings = embeddings_model.embed_documents(documents)

        # generate source in supabase
        sources_table_data = supabase.table("sources").insert({
            "uid": item.uid,
            "data": item.data,
            "type": item.type,
            "completed": False 
        }).execute();

        
        data = []
        for (index, document) in enumerate(documents):
            data.append({ "embeddings": embeddings[index],
                          "uid": item.uid,  
                          "source_id": sources_table_data.data.id, 
                          "url": req_data.url + "/tree/" + req_data.branch + "/" + document.metadata['file_path'],
                        "snippet": ""
            })

        supabase.table("document_embeddings").insert(data)

        updates_source_table_data = supabase.table("sources").insert({"completed": True})

        tmp_dir.cleanup()
    elif item.type == "stackoverflow":
        
    elif item.type == "url":
        req_data = json.parse(item.data)
        loader = UnstructuredURLLoader(urls=[req_data['url']])
        data = loader.load()
        # split the document into several pieces
        text_splitter = RecursiveCharacterTextSplitter()
        split_data = text_splitter.create_documents([data])

        

    elif item.type == "text":
