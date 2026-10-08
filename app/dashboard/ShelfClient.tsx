"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Plan } from "@/lib/plans";
import type { Book, Hero, Page } from "@/lib/book";
import { pageDims } from "@/lib/book";
import { importLocalBooks } from "@/lib/sync";

const PageStage = dynamic(() => import("@/components/editor/PageStage"), { ssr: false });

interface ShelfBook {
  id: string;
  title: string;
  updated_at: string;
  page_count: number;
  trim: string;
  hero: Hero | null;
  cover: Page;
}

export default function ShelfClient({ userId, plan }: { userId: string; plan: Plan }) {
  const [books, setBooks] = useState<ShelfBook[] | null>(null);
  const [err, setErr] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const router = useRouter();

  const load = async () => {
    const r = await fetch("/api/books");
    const j = await r.json();
    if (!r.ok) return setErr(j.error ?? "Couldn't load your books.");
    setBooks(j.books);
  };

  useEffect(() => {
    importLocalBooks(userId).then((n) => {
      if (n) setNotice(`Moved ${n} book${n > 1 ? "s" : ""} from this browser into your account.`);
      load();
    });
    if (new URLSearchParams(location.search).get("upgraded")) setNotice("Thanks! Your plan is upgraded.");
  }, [userId]);

  const atLimit = (books?.length ?? 0) >= plan.limits.books;

  const manageBilling = async () => {
    const r = await fetch("/api/billing-portal", { method: "POST" });
    const j = await r.json();
    if (j.url) window.location.href = j.url;
  };

  const remove = async (id: string) => {
    setConfirmId(null);
    const r = await fetch(`/api/books/${id}`, { method: "DELETE" });
    if (r.ok) setBooks((b) => b?.filter((x) => x.id !== id) ?? null);
  };

  return (
    <>
      <div className="shelf-head">
        <h2>My bookshelf</h2>
        <span className="badge soft">{plan.name} plan · {books?.length ?? "–"}/{plan.limits.books} books</span>
        <span style={{ flex: 1 }} />
        <a className="btn ghost" href="/orders">Orders</a>
        {plan.id === "free" ? <a className="btn ghost" href="/pricing">Upgrade</a> : <button className="btn ghost" onClick={manageBilling}>Manage billing</button>}
      </div>
      {notice && <p className="notice">{notice}</p>}
      {err && <p className="err" role="alert">{err}</p>}
      {!books && !err && <p className="hint">Dusting off your shelf…</p>}
      {books && (
        <div className="shelf">
          <button className="new-book" onClick={() => (atLimit ? router.push("/pricing") : router.push("/new"))}>
            <span style={{ fontSize: 40 }}>{atLimit ? "🔒" : "＋"}</span>
            {atLimit ? "Upgrade for more books" : "New book"}
          </button>
          {books.map((b) => {
            const d = pageDims(b.trim);
            const mini = { id: b.id, trim: b.trim, hero: b.hero ?? undefined, pages: [b.cover] } as Book;
            return (
              <div key={b.id} className="book-card">
                <a href={`/editor/${b.id}`} className="cover" aria-label={`Open ${b.title}`}>
                  <PageStage book={mini} page={b.cover} scale={170 / Math.max(d.width, d.height)} />
                </a>
                <div className="meta">
                  <span>{b.title}</span>
                  {confirmId === b.id ? (
                    <span className="confirm-del">
                      <button className="btn ghost small" onClick={() => setConfirmId(null)}>Keep</button>
                      <button className="btn danger small" onClick={() => remove(b.id)}>Delete</button>
                    </span>
                  ) : (
                    <button className="icon" title="Delete" aria-label={`Delete ${b.title}`} onClick={() => setConfirmId(b.id)}>🗑</button>
                  )}
                </div>
                <span className="hint">{b.page_count} pages · {new Date(b.updated_at).toLocaleDateString()}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
