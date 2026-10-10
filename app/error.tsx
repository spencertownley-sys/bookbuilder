"use client";
import { useEffect } from "react";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="error-page">
      <span className="error-emoji" aria-hidden>🙈</span>
      <h1>Oops, a page got stuck.</h1>
      <p className="lead-sm">Your books are saved. Try again, or head back to your bookshelf.</p>
      <div className="form-actions center">
        <button className="btn primary" onClick={() => retry()}>Try again</button>
        <a className="btn ghost" href="/dashboard">My books</a>
      </div>
      {error.digest && <p className="fineprint">Reference: {error.digest}</p>}
    </main>
  );
}
