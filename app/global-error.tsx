"use client";

// Replaces the root layout when it fails, so it brings its own document and styles.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fff8ee", color: "#2a363b" }}>
        <title>Something went wrong — Book Builder</title>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 56 }} aria-hidden>🙈</div>
          <h1 style={{ margin: 0 }}>Something went wrong.</h1>
          <p style={{ margin: 0, color: "#5d6b72" }}>Your books are saved. Please try again in a moment.</p>
          <button
            onClick={() => retry()}
            style={{ border: 0, borderRadius: 999, padding: "12px 22px", background: "#7c4dff", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" }}
          >
            Try again
          </button>
          {error.digest && <p style={{ fontSize: 12, color: "#5d6b72" }}>Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
