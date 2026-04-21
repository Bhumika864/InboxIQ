import React, { useState } from "react";

export default function Login() {
  const [hovered, setHovered] = useState(false);
  const API_BASE_URL = "http://localhost:5000";

  const handleLogin = () => {
    const redirectOrigin = encodeURIComponent(window.location.origin);
    window.location.href = `${API_BASE_URL}/auth/google?redirectOrigin=${redirectOrigin}`;
  };

  return (
    <div style={styles.container}>
      {/* Background grid pattern */}
      <div style={styles.gridOverlay} />

      {/* Glow orb */}
      <div style={styles.glowOrb} />

      <div style={styles.card}>
        {/* Logo area */}
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="10" height="10" rx="2" fill="#f59e0b" />
              <rect
                x="16"
                y="2"
                width="10"
                height="10"
                rx="2"
                fill="#f59e0b"
                opacity="0.5"
              />
              <rect
                x="2"
                y="16"
                width="10"
                height="10"
                rx="2"
                fill="#f59e0b"
                opacity="0.5"
              />
              <rect
                x="16"
                y="16"
                width="10"
                height="10"
                rx="2"
                fill="#f59e0b"
                opacity="0.3"
              />
            </svg>
          </div>
          <h1 style={styles.title}>InboxIQ</h1>
        </div>

        <div style={styles.divider} />

        <p style={styles.subtitle}>
          Your inbox, understood.
          <br />
          <span style={styles.subtitleMuted}>
            AI-powered email intelligence.
          </span>
        </p>

        <button
          onClick={handleLogin}
          style={{ ...styles.button, ...(hovered ? styles.buttonHover : {}) }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <p style={styles.disclaimer}>
          By continuing, you agree to grant InboxIQ read access to your Gmail
          inbox.
        </p>
      </div>

      <p style={styles.footer}>InboxIQ — AI Email Intelligence</p>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(1.05); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#0a0e1a",
    fontFamily: "'Sora', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  gridOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(245,158,11,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,158,11,0.04) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
    pointerEvents: "none",
  },
  glowOrb: {
    position: "absolute",
    top: "20%",
    left: "50%",
    transform: "translateX(-50%)",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)",
    animation: "pulse 4s ease-in-out infinite",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 10,
    width: "380px",
    padding: "40px",
    backgroundColor: "#0f1525",
    border: "1px solid rgba(245,158,11,0.15)",
    borderRadius: "16px",
    boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 32px 80px rgba(0,0,0,0.6)",
    animation: "fadeUp 0.6s ease both",
  },
  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "24px",
  },
  logoIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    backgroundColor: "rgba(245,158,11,0.1)",
    border: "1px solid rgba(245,158,11,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#f8fafc",
    letterSpacing: "-0.5px",
  },
  divider: {
    height: "1px",
    background:
      "linear-gradient(90deg, rgba(245,158,11,0.3) 0%, transparent 100%)",
    marginBottom: "24px",
  },
  subtitle: {
    fontSize: "16px",
    fontWeight: "500",
    color: "#f8fafc",
    lineHeight: "1.6",
    marginBottom: "32px",
  },
  subtitleMuted: {
    fontSize: "13px",
    fontWeight: "400",
    color: "#64748b",
    fontFamily: "'JetBrains Mono', monospace",
  },
  button: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "13px 20px",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "'Sora', sans-serif",
    cursor: "pointer",
    transition: "all 0.2s ease",
    letterSpacing: "0.01em",
    marginBottom: "20px",
  },
  buttonHover: {
    backgroundColor: "#f1f5f9",
    transform: "translateY(-1px)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
  },
  disclaimer: {
    fontSize: "11px",
    color: "#475569",
    lineHeight: "1.6",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: "24px",
    fontSize: "11px",
    color: "#334155",
    fontFamily: "'JetBrains Mono', monospace",
    zIndex: 10,
  },
};
