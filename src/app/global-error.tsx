"use client";

// Catches errors thrown in the root layout itself (e.g. the sidebar).
// Must render its own <html>/<body>; styles are inlined because the app's
// CSS may not have loaded.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f3ea",
          color: "#1e2a20",
          fontFamily: "Georgia, serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>
            Something went sideways.
          </h1>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.6, opacity: 0.75 }}>
            Your learning progress is saved. Try again — if this keeps
            happening, reload the page.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.7rem 1.4rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#3e7c4f",
              color: "#f2ecdd",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
