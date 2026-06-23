from langfuse import Langfuse
from app.core.config import settings
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

if settings.llm_provider == "openai":
    from langchain_openai import OpenAIEmbeddings, ChatOpenAI
else:
    from langchain_ollama import OllamaEmbeddings, ChatOllama


langfuse = Langfuse(
    public_key=settings.langfuse_public_key,
    secret_key=settings.langfuse_secret_key,
    host=settings.langfuse_host
)

PROMPT_TEMPLATE = """You are a helpful document assistant.
Answer the user's question based ONLY on the following context.
If you can't find the answer in the context, say "I can not find the answer in the provided documents"
If at the end of the chat if user say thanks or thank you or any other greeting word, reply as per the greeting.
Do not make up any information.

Context:
{context}

Question:
{question}

Answer:
"""

def get_embedding():
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
        embedding_function=get_embedding()
    )

def format_docs(docs):
    return "\n\n---\n\n".join([
        f"Source: {doc.metadata.get('source', 'unknown')}\n{doc.page_content}"
        for doc in docs
    ])

def get_answer(question: str, doc_id: str = None, session_id: str = None):
    # Start main trace
    trace = langfuse.start_observation(
        name="rag-query",
        input={"question": question, "doc_id": doc_id}
    )

    try:
        # Step 1 — Retrieve relevant chunks
        span1 = langfuse.start_observation(
            name="retrieval",
            input={"question": question}
        )
        vector_store = get_vector_store()
        if doc_id:
            retriever = vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={
                    "k": 8,
                    "filter": {"doc_id": doc_id}
                }
            )
        else:
            retriever = vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 8}
            )
        retrieved_docs = retriever.invoke(question)
        
        context = format_docs(retrieved_docs)
        span1.update(output={"chunks_retrieved": len(retrieved_docs)})
        span1.end()
        print(f"Retrieved {len(retrieved_docs)} chunks")

        # Step 2 — Generate answer
        span2 = langfuse.start_observation(
            name="generation",
            input={"question": question, "context": context}
        )

        if settings.llm_provider == "openai":
            llm = ChatOpenAI(
                model=settings.openai_model,
                api_key=settings.openai_api_key,
                temperature=0.1
            )
        else:
            llm = ChatOllama(
                model=settings.ollama_model,
                base_url=settings.ollama_base_url,
                temperature=0.1
            )


        prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
        chain = prompt | llm | StrOutputParser()
        answer = chain.invoke({
            "context": context,
            "question": question
        })
        span2.update(output={"answer": answer})
        span2.end()
        print(f"Generated answer successfully")

        trace.update(output={"answer": answer, "chunks_retrieved": len(retrieved_docs)})
        trace.end()

        return {
            "answer": answer,
            "source_chunks": len(retrieved_docs),
            "sources": [doc.metadata.get("source", "unknown") for doc in retrieved_docs]
        }

    except Exception as e:
        trace.update(output={"error": str(e)})
        trace.end()
        print(f"RAG query failed: {str(e)}")
        raise e