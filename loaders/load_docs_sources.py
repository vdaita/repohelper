from langchain.document_loaders import WebBaseLoader
from supabase import create_client
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import HuggingFaceEmbeddings, OpenAIEmbeddings
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import requests
import os

load_dotenv()

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SECRET_KEY")

supabase = create_client(supabase_url, supabase_key)

rootdir = "mantine_docs"
for subdir, dirs, files in os.walk(rootdir):
    for file in files:
        fp = os.path.join(subdir, file)
        print(fp)
        f = open(fp, "r")
        data = f.read()

        try: 
            slug = data.split("slug: ")[1].split("\n")[0]
            title = data.split("title: ")[1].split("\n")[0]

            url = "https://mantine.dev" + slug
            
            supabase.table("sources").insert([{
                "name": url,
                "repo": "mantine",
                "content": data
            }]).execute()
        except Exception:
            print("Error fetching: ", fp)