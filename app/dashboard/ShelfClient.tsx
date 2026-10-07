"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hydrateForUser, useStore } from "@/lib/store";
import type { Plan } from "@/lib/plans";
import dynamic from "next/dynamic";
const PageStage = dynamic(() => import("@/components/editor/PageStage"), { ssr: false });
import { pageDims } from "@/lib/book";

export default function ShelfClient({ userId, plan }: { userId: string; plan: Plan }) {
  const [ready, setReady] = useState(false);
  const books = useStore((s) => s.books);
  const createBook = useStore((s) => s.createBook);
  const deleteBook = useStore((s) => s.deleteBook);
  const router = useRouter();

  useEffect(() => {
    Promise.resolve(hydrateForUser(userId)).then(() => setReady(true));
  }, [userId]);

  const list = Object.values(books).sort((a, b) => b.updatedAt - a.updatedAt);
  const atLimit = list.length >= plan.limits.books;

  const manageBilling = async () => {
    const r = await fetch("/api/billing-portal", { method: "POST" });
    const j = await r.json();
    if (j.url) window.location.href = j.url;
  };

  if (!ready) return <p className="hint">Dusting off your shelf…</p>;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <h2 style={{ textAlign: "left", margin: 0 }}>My bookshelf</h2>
        <span className="badge" style={{ background: "var(--purple-soft)" }}>{plan.name} plan · {list.length}/{plan.limits.books} books</span>
        <span style={{ flex: 1 }} />
        {plan.id === "free" ? <a className="btn ghost" href="/pricing">Upgrade</a> : <button className="btn ghost" onClick={manageBilling}>Manage billing</button>}
      </div>
      <div className="shelf">
        <button
          className="new-book"
          onClick={() => {
            if (atLimit) return router.push("/pricing");
            const id = createBook("My Story");
            router.push(`/editor/${id}`);
          }}
        >
          <span style={{ fontSize: 40 }}>{atLimit ? "🔒" : "＋"}</span>
          {atLimit ? "Upgrade for more books" : "New book"}
        </button>
        {list.map((b) => {
          const d = pageDims(b.trim);
          return (
            <div key={b.id} className="book-card">
              <a href={`/editor/${b.id}`} className="cover">
                <PageStage book={b} page={b.pages[0]} scale={170 / Math.max(d.width, d.height)} />
              </a>
              <div className="meta">
                <span>{b.title}</span>
                <button className="icon" title="Delete" onClick={() => confirm(`Delete “${b.title}”?`) && deleteBook(b.id)}>🗑</button>
              </div>
              <span className="hint">{b.pages.length} pages · {new Date(b.updatedAt).toLocaleDateString()}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
