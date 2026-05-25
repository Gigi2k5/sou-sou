"use client";

import { useEffect } from "react";

/**
 * Boundary de dernier recours : Next.js l'utilise quand l'erreur survient
 * dans le RootLayout lui-même. Doit définir <html> et <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Sou'Sou root error:", error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          fontFamily:
            "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#F8FAFC",
          color: "#1E293B",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 400 }}>
          <h1
            style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontSize: "2rem",
              margin: "0 0 0.75rem",
              color: "#1E293B",
            }}
          >
            Sou&apos;Sou est temporairement indisponible
          </h1>
          <p style={{ color: "#717973", marginBottom: "1.5rem" }}>
            Une erreur grave est survenue. Recharge la page pour réessayer.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#10B981",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 12,
              padding: "0.75rem 1.5rem",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.95rem",
            }}
          >
            Recharger
          </button>
        </div>
      </body>
    </html>
  );
}
