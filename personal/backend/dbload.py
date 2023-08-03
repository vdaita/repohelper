import typer
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

app = typer.Typer()

@app.command()
def load(source: str, repo: str, loader: str):
    print(f"Pulling source {source} for source {repo} with loader {loader}")

    
    data = []


if __name__ == "__main__":
    app()