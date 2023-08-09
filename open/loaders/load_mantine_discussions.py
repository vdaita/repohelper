from langchain.document_loaders import WebBaseLoader, GithubIssuesLoader
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
text_splitter = RecursiveCharacterTextSplitter(chunk_size=750, chunk_overlap=0)

embeddings_model = OpenAIEmbeddings(openai_api_key=os.environ.get("OPENAI_API_KEY"))


# for doc in docs: 
#     doc_texts.append(doc.page_content)

# embeddings = embeddings_model.embed_documents(docs)

# print(docs[0].metadata)
