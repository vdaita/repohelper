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
embeddings_repo_id = "sentence-transformers/all-MiniLM-L6-v2" # this should actually be better than the regular models
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=0)

# embeddings_model = HuggingFaceEmbeddings(model_name=embeddings_repo_id)
embeddings_model = OpenAIEmbeddings(openai_api_key=os.environ.get("OPENAI_API_KEY"))

file = open("mantine_sidebar.html", "r")
raw_html = file.read()

def add_padding(html):
    tags = ["div", "a", "p", "h1", "code", "button", "h2"]
    for tag in tags:
        html.replace(f"</{tag}>", f"</{tag}>\n\n")
    return html

soup = BeautifulSoup(raw_html, "html.parser")
urls = []
for el in soup.find_all("a"):
    href = el['href']
    if href.startswith("/"):
        urls.append("https://mantine.dev" + href)

for url in urls:
    # loader = WebBaseLoader(url)
    html_doc = requests.get(url)
    html_doc = html_doc.text
    soup = BeautifulSoup(add_padding(html_doc), "html.parser")

    title = soup.find("title").get_text()

    article = soup.find("article")
    text = article.get_text(separator=u' ')

    unsplit_document = Document(page_content=text, metadata={
        "source": url,
        "title": title
    })

    documents = text_splitter.split_documents([unsplit_document])

    # print(documents)
    print("Loading document ", url)
    document_texts = []
    for document in documents:
        document_texts.append(document.page_content)
    embeddings = embeddings_model.embed_documents(document_texts)

    data = []
    for i in range(len(documents)):

        # how to add information to the content for context
        new_page_content = ""
        
        if i > 0:
            new_page_content += documents[i - 1].page_content

        new_page_content += documents[i].page_content

        if i < len(documents) - 1:
            new_page_content += documents[i + 1].page_content
         
        data.append({
            "embedding": embeddings[i],
            "metadata": documents[i].metadata,
            "content": new_page_content,
            "repo": "mantine"
        })

    for i in range(0, len(documents), 50):
        supabase.table("documents").insert(data[i:i+50]).execute()
