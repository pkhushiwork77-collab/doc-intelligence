import { use, useState } from "react";
import { login, register } from "../api/auth";
import { useNavigate } from "react-router-dom"

export default function LoginPage() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState("");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try{
            if(isLogin) {
                const data = await login(email, password)
                localStorage.setItem("token", data.access_token)
                navigate("/documents")
            } else {
                await register(email, password, fullName)
                const data = await login(email, password)
                localStorage.setItem("token", data.access_token)
                navigate("/documents")
            }
        } catch(err){
            setError(err.response?.data?.detail || "Something went wrong")
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>Document Intelligence</h1>
                <p style={styles.subtitle}>
                    {isLogin ? "Sign in to your account" : "Create a new account"}
                </p>

                {error && <div style={styles.error}>{error}</div>}

                <form style={styles.form} onSubmit={handleSubmit}>
                    {!isLogin && (
                        <input
                            style={styles.input}
                            type="text"
                            placeholder="Full Name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    )}
                    <input
                        type="email"
                        style={styles.input}
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        style={styles.input}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                        style={styles.button}
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Please wait...' : isLogin ? 'Sign In': 'Sign Up'}
                    </button>
                </form>

                <p style={styles.toggle}>
                    {isLogin ? "Don't you have an account" : "Already have an account ?"}{" "}
                    <span
                        style={styles.link}
                        onClick={() => {
                            setIsLogin(!isLogin)
                            setError("");
                        }}
                    >
                        {isLogin ? "Sign Up": "Sign In"}
                    </span>
                </p>
            </div>
        </div>
    )
}


const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "white",
    padding: "2rem",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "400px",
  },
  title: {
    margin: "0 0 0.5rem",
    fontSize: "1.8rem",
    color: "#1a1a1a",
    textAlign: "center",
  },
  subtitle: {
    margin: "0 0 1.5rem",
    color: "#666",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  input: {
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "1rem",
    outline: "none",
  },
  button: {
    padding: "0.75rem",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#4f46e5",
    color: "white",
    fontSize: "1rem",
    cursor: "pointer",
    fontWeight: "600",
  },
  error: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    padding: "0.75rem",
    borderRadius: "8px",
    marginBottom: "1rem",
    fontSize: "0.9rem",
  },
  toggle: {
    textAlign: "center",
    marginTop: "1.5rem",
    color: "#666",
  },
  link: {
    color: "#4f46e5",
    cursor: "pointer",
    fontWeight: "600",
  },
};