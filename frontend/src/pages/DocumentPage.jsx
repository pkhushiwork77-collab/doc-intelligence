import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadDocument, listDocument, deleteDocument } from "../api/document";


export default function DocumentPage() {
    const navigate = useNavigate();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [documents, setDocuments] = useState([])
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDocument();
    }, []);

    const handleLogout = async () =>{
        localStorage.removeItem("token");
        navigate("/login")
    }

    const fetchDocument = async() => {
        try {
            const data = await listDocument();
            setDocuments(data);
            return data;
        } catch(err){
            setError("Failed to load Documents")
            return null;
        } finally {
            setLoading(false)
        }
    }

    const handleUpload = async(e) => {
        const file = e.target.files[0];
        console.log("File", file);
        
        if (!file) return;
        
        console.log(123);
        setUploading(true);
        console.log(456);
        setError("");
        
        try {
            await uploadDocument(file);

            // after upload, poll documents until ingestion completes (no documents with status "processing")
            const pollInterval = 2000; // ms
            const maxAttempts = 30; // ~1 minute
            let attempts = 0;

            while (attempts < maxAttempts) {
                const docs = await fetchDocument();
                if (!docs) break;

                const anyProcessing = docs.some(d => d.status === "processing");
                if (!anyProcessing) break;

                await new Promise(res => setTimeout(res, pollInterval));
                attempts++;
            }
        } catch(err) {
            setError(err.response?.data?.detail || "Upload failed")
        } finally {
            setUploading(false);
        }
    }

    const handleDelete = async(id) => {
        if (!confirm("Are you sure you want to delete this document?")) return;

        try{
            await deleteDocument(id);
            await fetchDocument();
        } catch(err) {
            setError("Failed to delete document");
        }
    }

    const getStatusColor = (status) => {
        if (status == "ready") return "#16a34a";
        if (status === "processing") return "#d97706";
        if (status === "failed") return "#dc2626";
        return "#6b7280";
    }

    return(
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.headerTitle}>Document Intelligence</h1>
                <button style={styles.logoutBtn} onClick={handleLogout}>
                    Logout
                </button>
            </div>

            {/* Main content */}
            <div style={styles.content}>
                <div style={styles.topBar}>
                    <h2 style={styles.pageTitle}>My Documents</h2>
                    <label style={styles.uploadBtn}>
                        {uploading ? "Uploading....": "+ Upload Document"}
                        <input
                            type="file"
                            accept=".pdf,.docx"
                            onChange={handleUpload}
                            style={{ display: "none" }}
                            disabled={uploading}
                        />
                    </label>
                </div>

                {error && <div style={styles.error}>{error}</div>}

                {loading ? (
                    <p style={styles.empty}>Loading documents...</p>
                ) : documents.length == 0 ? (
                    <div style={styles.emptyState}>
                        <p>No documents yet.</p>
                        <p>Upload a PDF or Word document to get started!</p>
                    </div>
                ) : (
                     <div style={styles.grid}>
                        {documents.map((doc) => (
                            <div key={doc.id} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <span style={styles.fileIcon}>📄</span>
                                    <span
                                        style={{
                                        ...styles.status,
                                        color: getStatusColor(doc.status),
                                        }}
                                    >
                                        {doc.status}
                                    </span>
                                </div>
                                <p style={styles.docName}>{doc.original_name}</p>
                                <p style={styles.docMeta}>
                                    {doc.file_type === "application/pdf" ? "PDF" : "Word"} •{" "}
                                    {doc.chunk_count} chunks
                                </p>
                                <div style={styles.cardActions}>
                                    <button
                                        style={{
                                            ...styles.chatBtn,
                                            opacity: doc.status == "ready" ? 1 : 0.5
                                        }}
                                        disabled={doc.status != "ready"}
                                        onClick={() => navigate(`/chat/${doc.id}`)}
                                    >
                                        Chat
                                    </button>
                                    <button
                                        style={styles.deleteBtn}
                                        onClick={() => handleDelete(doc.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                     </div>
                )}
            </div>
        </div>
    )
}


const styles = {
  container: { minHeight: "100vh", backgroundColor: "#f5f5f5" },
  header: {
    backgroundColor: "#4f46e5",
    padding: "1rem 2rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "white", margin: 0, fontSize: "1.4rem" },
  logoutBtn: {
    backgroundColor: "transparent",
    border: "1px solid white",
    color: "white",
    padding: "0.4rem 1rem",
    borderRadius: "6px",
    cursor: "pointer",
  },
  content: { maxWidth: "1000px", margin: "0 auto", padding: "2rem" },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  pageTitle: { margin: 0, fontSize: "1.5rem", color: "#1a1a1a" },
  uploadBtn: {
    backgroundColor: "#4f46e5",
    color: "white",
    padding: "0.6rem 1.2rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.9rem",
  },
  error: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    padding: "0.75rem",
    borderRadius: "8px",
    marginBottom: "1rem",
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem",
    color: "#666",
    backgroundColor: "white",
    borderRadius: "12px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "1rem",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "1.2rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.8rem",
  },
  fileIcon: { fontSize: "1.5rem" },
  status: { fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase" },
  docName: {
    margin: "0 0 0.3rem",
    fontWeight: "600",
    fontSize: "0.95rem",
    color: "#1a1a1a",
    wordBreak: "break-all",
  },
  docMeta: { margin: "0 0 1rem", fontSize: "0.8rem", color: "#666" },
  cardActions: { display: "flex", gap: "0.5rem" },
  chatBtn: {
    flex: 1,
    padding: "0.5rem",
    backgroundColor: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.85rem",
  },
  deleteBtn: {
    padding: "0.5rem 0.8rem",
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.85rem",
  },
  empty: { textAlign: "center", color: "#666" },
};