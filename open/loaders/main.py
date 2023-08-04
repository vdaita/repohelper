import typer
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from langchain.docstore.document import Document
from langchain.document_loaders import GitLoader, GitHubIssuesLoader, ReadTheDocsLoader, UnstructuredURLLoader, GitbookLoader
from langchain.document_loaders.recursive_url_loader import RecursiveUrlLoader
from langchain.embeddings import HuggingFaceHubEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from stackapi import StackAPI
from langchain.embeddings import AlephAlphaAsymmetricSemanticEmbedding, OpenAIEmbeddings
from langchain.callbacks import AsyncIteratorCallbackHandler
from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage, AIMessage
from langchain.chains import RetrievalQAWithSourcesChain
from langchain.vectorstores import SupabaseVectorStore
import json
import shutil
import tempfile

load_dotenv()

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
gh_access_token = os.environ.get("GH_ACCESS_TOKEN")
hf_api_token = os.environ.get("HF_API_TOKEN")

supabase = create_client(supabase_url, supabase_key)
# embeddings_model = HuggingFaceHubEmbeddings()
embeddings_repo_id = "sentence-transformers/all-MiniLM-L6-v2"
embeddings_model = HuggingFaceHubEmbeddings(repo_id=embeddings_repo_id, huggingface_api_token=)
text_splitter = RecursiveCharacterTextSplitter(chunk_size=3000, chunk_overlap=500)
stackoverflow_filter = "!-MBrU_IzpJ5H-AG6Bbzy.X-BYQe(2v-.J"
stackoverflow_site = StackAPI('stackoverflow')

app = typer.Typer()

@app.command()
def load_ghissues(issues_repo, store_repo):
    print("Running GitHub Issues loader: ", issues_repo + " for  " + store_repo)
    loader = GitHubIssuesLoader(repo=issues_repo, access_token=access_token, include_prs=False)
    documents = loader.load_and_split(text_splitter)
    for i in range(0, len(documents)):
        documents[i]["source"] = documents[i]["url"]
    
    embeddings = embeddings_model.embed_documents(documents)

    data = []
    for document in documents:
        data.append({
            "embeddings": embeddings,
            "metadata": document.metadata,
            "content": document.pageContent,
            "repo": store_repo
        })

    supabase.table("documents").insert(data)

@app.command()
def load_stackoverflow(tag, repo, page=1, num_posts=200):
    print("Running StackOverflow loader: ", tag, num_posts, repo)
    questions = stackoverflow_site.fetch('questions', page=page, pagesize=num_posts, min=15, sort="votes", tagged=tag, filter=stackoverflow_filter)
    
    questions = questions["items"]

    documents = []

    for question in questions: 
        if question['is_answered']:
            question_body = question_body['body']
            selected_answer = ""
            for answer in question['answers']:
                if answer["is_accepted"]:
                    selected_answer = answer['body']

            combined = f"Question: ${question_body} \n Answer: ${selected_answer}"

            metadata = {"source": question["link"], "title": question["link"]}
            
            document = Document(pageContent=combined, metadata=metadata)

            documents.push(document)

    documents = text_splitter.split_documents(documents)
    embeddings = embeddings_model.embed_documents(documents)

    data = []
    for document in documents:
        data.append({
            "embeddings": embeddings,
            "metadata": document.metadata,
            "content": document.pageContent,
            "repo": repo
        })

    supabase.table("documents").insert(data)



@app.command()
def load(url, repo, loadtype):
    print("Running loader: ", url, repo, loadtype)

    data = []
    documents = []
    embeddings = []
   
    if loadtype == "git":
        tmp_dir = tempfile.mkdtemp()
        loader = GitLoader(
            clone_url=url,
            repo_path = tmp_dir,
            branch="master"
        )

        documents = loader.load_and_split(text_splitter)            
        
        for (index, document) in enumerate(documents):
            document_url = f"{url}/tree/master/{document.metadata['file_path']}"
            documents[index].metadata['source'] = document_url

        shutil.rmtree(tmp_dir)

    elif loadtype == "rtdocs":
        tmp_dir = tempfile.mkdtemp()
        os.system("wget -r -A.html -P " + tmp_dir + " " + url)
        loader = ReadTheDocsLoader(tmp_dir, features="html.parser")

        documents = loader.load_and_split(text_splitter)

    elif loadtype == "gitbook":
        loader = GitbookLoader(url, load_all_paths=True)
        documents = loader.load_and_split(text_splitter)

    elif loadtype == "recurl":
        loader = RecursiveUrlLoader(url=url)
        documents = loader.load_and_split(text_splitter)
    
    embeddings = embeddings_model.embed_documents(documents)

    for (index, document) in enumerate(documents):
        data.append({
            "embeddings": embeddings[index],
            "metadata": document.metadata,
            "content": document.pageContent,
            "repo": repo
        })

    supabase.table("documents").insert(data)
        
    # elif loadtype == "url":
    #     loader = UnstructuredURLLoader(urls=[req_data['url']])
    #     documents = loader.load()
    #     # split the document into several pieces 
    #     text_splitter = RecursiveCharacterTextSplitter()
    #     split_documents = text_splitter.create_documents([documents])

    #     embeddings = embeddings_model.embed_documents(split_documents)

    #     for (index, document) in enumerate(split_documents):
    #         data.append({ "embeddings": embeddings,
    #                     "uid": item.uid,
    #                     "source_id": sources_table_data.data.id,
    #                     "url": req_data["url"],
    #                     "snippet": document.page_content
    #                     })

if __name__ == "__main__":
    app()