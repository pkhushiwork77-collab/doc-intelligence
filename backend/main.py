from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth
from app.api import document
from app.api import chat

app = FastAPI(
    title = "Document Intelligence Platform",
    description="Upload document and chat with them using AI",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://doc-intelligence-three.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(document.router, prefix="/api/document", tags=["document"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

@app.get("/")
async def read_root():
    return {"message": "Document Intelliegence Platform is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}