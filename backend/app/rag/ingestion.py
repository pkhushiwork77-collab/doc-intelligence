import os
from langfuse import Langfuse
from app.core.config import settings
from app.core.database import sessionLocal
from app.models.document import Document
from langchain_community.document_loaders import PyMuPDFLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma

if settings.llm_provider == "openai":
    from langchain_openai import OpenAIEmbeddings
else:
    from langchain_ollama import OllamaEmbeddings


langfuse = Langfuse(
    public_key=settings.langfuse_public_key,
    secret_key=settings.langfuse_secret_key,
    host=settings.langfuse_host
)

def load_document(file_path: str, file_type: str):
    if file_type == "application/pdf":
        loader = PyMuPDFLoader(file_path)
        docs = loader.load()

        total_content = "".join([doc.page_content for doc in docs])

        if not total_content.strip():
            # PDF has no extrable content, use OCR
            print("Normal PDF loading returned empty, switching to OCR...")
            import pdf2image
            import pytesseract
            from langchain_core.documents import Document as LangchainDocument

            images = pdf2image.convert_from_path(file_path)
            docs = []
            for i, image in enumerate(images):
                text = pytesseract.image_to_string(image)
                docs.append(LangchainDocument(
                    page_content=text,
                    metadata={
                        "source": file_path,
                        "page": i,
                        "total_pages": len(images)
                    }
                ))
            print(f"OCR extracted text from {len(docs)} pages")
        
        return docs
    else:
        loader = Docx2txtLoader(file_path)
    
    return loader.load()

def get_embeddings():
    if settings.llm_provider == "openai":
        return OpenAIEmbeddings(
            model=settings.openai_embedding_model,
            api_key=settings.openai_api_key
        )
    else:
        return OllamaEmbeddings(
            model=settings.ollama_embedding_model,
            base_url=settings.ollama_base_url
        )

def get_vector_store():
    return Chroma(
        persist_directory=settings.chroma_path,
        embedding_function=get_embeddings()
    )


def ingest_document(file_path: str, doc_id: str, metadata: dict):
    db = sessionLocal()

    try:
        # Update document status to processing
        document = db.query(Document).filter(Document.id == doc_id).first()
        print("Document Found: ", document.status)
        document.status = "processing"
        db.commit()
        print("Document status updated: ", document.status)

        # Start main trace
        with langfuse.start_as_current_observation(
            name="document-ingestion",
            as_type="span",
            input={"doc_id": doc_id, "metadata": metadata}
        ) as trace:

            # Step 1 — Load document
            with langfuse.start_as_current_observation(
                name="load-document",
                as_type="span",
                input={"file_path": file_path}
            ) as span:
                file_type = metadata.get("file_type", "application/pdf")
                raw_docs = load_document(file_path, file_type)
                span.update(output={"pages_loaded": len(raw_docs)})
                print(f"Loaded {len(raw_docs)} pages")

            # Step 2 — Split into chunks
            with langfuse.start_as_current_observation(
                name="chunk-document",
                as_type="span",
                input={"chunk_size": 1000, "chunk_overlap": 200}
            ) as span:
                splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1000,
                    chunk_overlap=200
                )
                chunks = splitter.split_documents(raw_docs)
                for chunk in chunks:
                    chunk.metadata.update({
                        **metadata,
                        "doc_id": doc_id
                    })
                span.update(output={"chunks_created": len(chunks)})
                print(f"Created {len(chunks)} chunks")
                exit

            # Step 3 — Embed and store in ChromaDB
            with langfuse.start_as_current_observation(
                name="embed-and-store",
                as_type="span",
                input={"chunks_to_embed": len(chunks)}
            ) as span:
                vectorstore = get_vector_store()
                vectorstore.add_documents(chunks)
                span.update(output={"chunks_stored": len(chunks)})
                print(f"Stored {len(chunks)} chunks in ChromaDB")

            # Update trace output
            trace.update(
                output={"chunks_stored": len(chunks), "status": "ready"}
            )

        # Update document status to ready
        document.status = "ready"
        document.chunk_count = len(chunks)
        db.commit()

        return len(chunks)

    except Exception as e:
        document = db.query(Document).filter(Document.id == doc_id).first()
        document.status = "failed"
        db.commit()
        print(f"Ingestion failed: {str(e)}")
        raise e

    finally:
        db.close()

