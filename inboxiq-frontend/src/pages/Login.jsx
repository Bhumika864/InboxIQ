import React from "react";

export default function Login() {
  const handleLogin = () => {
    // Redirect to the backend auth endpoint
    window.location.href = "http://localhost:5000/auth/google";
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>InboxIQ</h1>
        <p style={styles.subtitle}>Clean your inbox with AI</p>
        <button onClick={handleLogin} style={styles.button}>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#f4f4f5",
    fontFamily: "Inter, sans-serif",
  },
  card: {
    padding: "40px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    textAlign: "center",
    width: "360px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    margin: "0 0 8px 0",
    color: "#18181b",
  },
  subtitle: {
    fontSize: "14px",
    color: "#71717a",
    marginBottom: "32px",
  },
  button: {
    width: "100%",
    padding: "10px 16px",
    backgroundColor: "#18181b",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
};
