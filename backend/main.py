from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_text_splitters import RecursiveCharacterTextSplitter
from openai import OpenAI
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

@app.post("/generate_notes")
def generate_notes(payload: NotesRequest):

    document_text = payload.document_text
    topic = payload.topic

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

    return {"notes" : response.output_text}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)