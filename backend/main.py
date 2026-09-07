import io

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_text_splitters import RecursiveCharacterTextSplitter
from openai import OpenAI
from pypdf import PdfReader
import chromadb
import uuid

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI()

class NotesRequest(BaseModel):
    document_text: str
    topic: str

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages)

def build_notes(document_text: str, topic: str) -> str:
    text_splitter = RecursiveCharacterTextSplitter(chunk_size = 500, chunk_overlap = 10)
    texts = text_splitter.split_text(document_text)

    embeddings = []
    for chunk in texts:
        response = client.embeddings.create(
            input = chunk,
            model = "text-embedding-3-small",
        )
        embeddings.append(response.data[0].embedding)

    #fixed the erorr of requests after the first attempt failing by making each collection name be different
    chroma_client = chromadb.Client()
    collection_name = f"notes_{uuid.uuid4().hex}"
    collection = chroma_client.create_collection(name=collection_name)
    collection.add(
        documents=texts,
        embeddings=embeddings,
        ids=[f"chunkings_{i}" for i in range(len(texts))]
    )

    topic_embedding = client.embeddings.create(
        input=topic,
        model="text-embedding-3-small",
    ).data[0].embedding

    results = collection.query(
        query_embeddings=[topic_embedding],
        n_results=2
    )

    docs = results["documents"][0]
    context = "\n".join(docs)

    input_list = [{"role" : "user", "content" : f"Please provide notes for the user based off this context {context}, and please do not restate the topic, just present the important notes directly and organized"}]

    response = client.responses.create(
        model="gpt-5.6",
        input = input_list,
    )

    return response.output_text

@app.post("/generate_notes")
def generate_notes(payload: NotesRequest):
    return {"notes": build_notes(payload.document_text, payload.topic)}

@app.post("/generate_notes_from_pdf")
async def generate_notes_from_pdf(topic: str = Form(...), file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Uploaded file must be a PDF")

    pdf_bytes = await file.read()
    document_text = extract_text_from_pdf(pdf_bytes)

    if not document_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from the PDF")

    return {"notes": build_notes(document_text, topic)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)