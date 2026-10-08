"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Book } from "@/lib/book";
import type { RecordingMap } from "@/components/editor/Dialogs";

const Flipbook = dynamic(() => import("@/components/editor/Dialogs").then((m) => m.Flipbook), { ssr: false });

interface Shared {
  kind: "read" | "record";
  book: Book;
  recordings: RecordingMap;
  hearts: Record<string, number>;
}

function Reactions({ token, pageId, hearts, onHeart }: { token: string; pageId: string; hearts: number; onHeart: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState("");
  const [err, setErr] = useState("");
  const [hearted, setHearted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      setName(localStorage.getItem("bb-reader-name") ?? "");
    } catch {}
  }, []);
  useEffect(() => (setSent(""), setErr("")), [pageId]);

  const post = async (kind: "heart" | "note") => {
    setErr("");
    try {
      localStorage.setItem("bb-reader-name", name);
    } catch {}
    const r = await fetch(`/api/share/${token}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId, kind, body: note, name }),
    });
    const j = await r.json();
    if (!r.ok) return setErr(j.error ?? "Couldn't send that.");
    if (kind === "heart") {
      setHearted((h) => ({ ...h, [pageId]: true }));
      onHeart();
    } else {
      setNote("");
      setOpen(false);
      setSent("Your note was sent to the author.");
    }
  };

  return (
    <div className="reactions">
      <button className={"btn ghost light heart" + (hearted[pageId] ? " on" : "")} disabled={hearted[pageId]} onClick={() => post("heart")} aria-label="Send a heart">
        ❤️ {hearts || ""}
      </button>
      {!open && <button className="btn ghost light" onClick={() => setOpen(true)}>💬 Leave a note</button>}
      {open && (
        <form className="note-form" onSubmit={(e) => (e.preventDefault(), post("note"))}>
          <input id="reader-name" placeholder="Your name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          <input id="reader-note" placeholder="Say something about this page" value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} autoFocus />
          <button className="btn primary" type="submit">Send</button>
        </form>
      )}
      {sent && <span className="sent" role="status">{sent}</span>}
      {err && <span className="err" role="alert">{err}</span>}
    </div>
  );
}

export default function ReaderClient({ token }: { token: string }) {
  const [data, setData] = useState<Shared | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch(`/api/share/${token}`).then(async (r) => {
      const j = await r.json();
      if (!r.ok) setErr(j.error ?? "This book isn't available.");
      else setData(j);
    });
  }, [token]);

  if (err)
    return (
      <div className="loading" style={{ flexDirection: "column", gap: 8, textAlign: "center", padding: 24 }}>
        <span style={{ fontSize: 48 }}>📕</span>
        {err}
      </div>
    );
  if (!data) return <div className="loading">Opening the book…</div>;
  return (
    <Flipbook
      book={data.book}
      recordings={data.recordings}
      footer={(pageId) => (
        <Reactions
          token={token}
          pageId={pageId}
          hearts={data.hearts[pageId] ?? 0}
          onHeart={() => setData((d) => (d ? { ...d, hearts: { ...d.hearts, [pageId]: (d.hearts[pageId] ?? 0) + 1 } } : d))}
        />
      )}
    />
  );
}
