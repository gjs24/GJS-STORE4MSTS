"use client";

export default function Home() {
  function handleRetry() {
    window.location.href = "https://gjs-store-4-msts.vercel.app";
  }

  return (
    <main style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at center, #0f172a, #05070b)",
      color: "white",
      fontFamily: "system-ui, -apple-system, sans-serif",
      textAlign: "center",
      padding: "24px"
    }}>
      <div style={{
        width: "72px",
        height: "72px",
        borderRadius: "16px",
        background: "#dc2626",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "36px",
        marginBottom: "20px",
        boxShadow: "0 0 30px rgba(220, 38, 38, 0.4)"
      }}>
        🚆
      </div>

      <h1 style={{
        fontSize: "28px",
        fontWeight: "900",
        letterSpacing: "1px",
        textTransform: "uppercase",
        margin: "0 0 8px 0"
      }}>
        MSTS-GJS Production Store
      </h1>

      <p style={{
        color: "#94a3b8",
        maxWidth: "420px",
        fontSize: "14px",
        lineHeight: "1.6",
        margin: "0 0 24px 0"
      }}>
        Connecting to the official online depot. If this screen persists, please check your internet connection and click retry.
      </p>

      <button
        onClick={handleRetry}
        style={{
          background: "#dc2626",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "12px 28px",
          fontSize: "14px",
          fontWeight: "700",
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(220, 38, 38, 0.35)",
          transition: "transform 0.15s ease"
        }}
      >
        Connect to Store
      </button>
    </main>
  );
}