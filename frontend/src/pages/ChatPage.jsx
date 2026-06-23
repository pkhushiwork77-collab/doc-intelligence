import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDocument } from "../api/document";
import { sendMessage } from "../api/chat";

export default function ChatPage() {
    const { docId } = useParams();
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [document, setDocument] = useState(null);
    const [messages, setMessages] = useState([]);
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        if(docId){
            fetchDocument();
        }
    }, [docId])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchDocument = async () => {
        try {
            const document = await getDocument(docId);
            setDocument(document);
        } catch(err){
            setError("Failed to fetch a document");
        }
    }

    const handleSend = async () => {
        if(!question.trim() || loading) return;

        const userMessage = { role: 'user', content: question }
        setMessages((prev) => [...prev, userMessage]);
        setQuestion("");
        setLoading(true);

        try {
            const data = await sendMessage(question, docId);
            const assistantMessage = {
                role: "assistant",
                content: data.answer,
                sourceChunks: data.source_chunks,
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            const errorMessage = {
                role: "assistant",
                content: "Sorry something went wrong. Please try again.",
                isError: true,
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };


    return (
        <div style={styles.container}>
             {/* Header */}
             <div style={styles.header}>
                <button style={styles.backBtn} onClick={() => navigate("/documents")}>
                    ← Back
                </button>
                 <div style={styles.headerInfo}>
                    <h1 style={styles.headerTitle}>
                        {document ? document.original_name : "Chat"}
                    </h1>
                    {document && (
                        <span style={styles.headerMeta}>{document.chunk_count} chunks indexed</span>
                    )}
                 </div>
             </div>

             {/* Messages */}
             <div style={styles.messages}>
                {messages.length === 0 && (
                    <div style={styles.emptyState}>
                         <p style={styles.emptyTitle}>Ask anything about this document</p>
                         <p style={styles.emptySubtitle}>
                            Type your question below and press Enter
                        </p>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <div
                        key={index}
                        style={{
                        ...styles.messageBubble,
                        alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                        backgroundColor:
                            msg.role === "user"
                            ? "#4f46e5"
                            : msg.isError
                            ? "#fee2e2"
                            : "white",
                        color:
                            msg.role === "user"
                            ? "white"
                            : msg.isError
                            ? "#dc2626"
                            : "#1a1a1a",
                        }}
                    >
                        <p style={styles.messageContent}>{msg.content}</p>
                        {msg.sourceChunks && (
                            <p style={styles.sourceInfo}>
                                Based on {msg.sourceChunks} chunks
                            </p>
                        )}
                    </div>
                ))}

                {loading && (
                    <div style={{ ...styles.messageBubble, alignSelf: "flex-start", backgroundColor: "white" }}>
                        <p style={styles.messageContent}>Thinking...</p>
                    </div>
                )}

                <div ref={bottomRef} />

                {/* Input */}
                <div style={styles.inputArea}>
                     <textarea
                        style={styles.input}
                        placeholder="Ask a question about the document..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={2}
                        disabled={loading}
                    />
                    <button
                        style={{
                            ...styles.sendBtn,
                            opacity: loading || !question.trim() ? 0.5 : 1,
                        }}
                        disabled={loading || !question.trim()}
                        onClick={handleSend}
                    >
                        Send
                    </button>
                </div>
             </div>
        </div>
    )
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#4f46e5",
    padding: "1rem 2rem",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  backBtn: {
    backgroundColor: "transparent",
    border: "1px solid white",
    color: "white",
    padding: "0.4rem 1rem",
    borderRadius: "6px",
    cursor: "pointer",
  },
  headerInfo: { display: "flex", flexDirection: "column" },
  headerTitle: { color: "white", margin: 0, fontSize: "1rem", fontWeight: "600" },
  headerMeta: { color: "rgba(255,255,255,0.7)", fontSize: "0.8rem" },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  emptyState: {
    textAlign: "center",
    margin: "auto",
    color: "#666",
  },
  emptyTitle: { fontSize: "1.2rem", fontWeight: "600", color: "#1a1a1a" },
  emptySubtitle: { fontSize: "0.9rem" },
  messageBubble: {
    maxWidth: "70%",
    padding: "1rem",
    borderRadius: "12px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  messageContent: { margin: 0, lineHeight: "1.6", whiteSpace: "pre-wrap" },
  sourceInfo: {
    margin: "0.5rem 0 0",
    fontSize: "0.75rem",
    color: "#666",
    borderTop: "1px solid #eee",
    paddingTop: "0.5rem",
  },
  inputArea: {
    padding: "1rem 1.5rem",
    backgroundColor: "white",
    borderTop: "1px solid #eee",
    display: "flex",
    gap: "0.75rem",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "1rem",
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
  },
  sendBtn: {
    padding: "0.75rem 1.5rem",
    backgroundColor: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "1rem",
  },
};