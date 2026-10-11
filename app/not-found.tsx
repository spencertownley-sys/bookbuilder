import Link from "next/link";

export const metadata = { title: "Page not found — Book Builder" };

export default function NotFound() {
  return (
    <main className="error-page">
      <span className="error-emoji" aria-hidden>📕</span>
      <h1>We couldn&apos;t find that page.</h1>
      <p className="lead-sm">It may have moved, or the link may have been turned off.</p>
      <div className="form-actions center">
        <Link className="btn primary" href="/">Home</Link>
        <Link className="btn ghost" href="/dashboard">My books</Link>
      </div>
    </main>
  );
}
