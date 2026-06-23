from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # LLM Provider - "ollama" or "openai"
    llm_provider: str = "ollama"

    # OpenAI
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"

    # ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str
    ollama_embedding_model: str

    # Langfuse
    langfuse_public_key: str
    langfuse_secret_key: str
    langfuse_host: str = "https://cloud.langfuse.com"

    # Database
    database_url: str

    # ChromaDB
    chroma_path: str = "./chroma_db"

    class Config:
        env_file =".env"

settings = Settings()
