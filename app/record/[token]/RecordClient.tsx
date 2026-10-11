"use client";
import { useEffect, useLayoutEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Book, pageDims } from "@/lib/book";
import type { RecordingMap } from "@/components/editor/Dialogs";
import Recorder from "@/components/Recorder";

const PageStage = dynamic(() => import("@/components/editor/PageStage"), { ssr: false });

export default function RecordClient({ token }: { token: string }) {
  const [book, setBook] = useState<Book | null>(null);
  const [recs, setRecs] = useState<RecordingMap>({});
  const [err, setErr] = useState("");
  const [i, setI] = useState(0);
  const [name, setName] = useState("");
  const [w, setW] = useState(360);

  useLayoutEffect(() => {
    const f = () => setW(Math.min(560, window.innerWidth - 32));
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  useEffect(() => {
    try {
      setName(localStorage.getItem("bb-reader-name") ?? "");
    } catch {}
    fetch(`/api/share/${token}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok || j.kind !== "record") return setErr(j.error ?? "This recording link isn't active.");
        setBook(j.book);
        setRecs(j.recordings);
      })
      .catch(() => setErr("We couldn't open this book. Check your connection and try again."));
  }, [token]);

  if (err) return <div className="loading" style={{ padding: 24, textAlign: "center" }}>{err}</div>;
  if (!book) return <div className="loading">Opening the book…</div>;
  const p = book.pages[i];
  const d = pageDims(book.trim);
  const done = Object.keys(recs).length;

  const save = async (blob: Blob, ms: number) => {
    try {
      localStorage.setItem("bb-reader-name", name);
    } catch {}
    const form = new FormData();
    form.append("audio", blob, "voice");
    form.append("durationMs", String(ms));
    const r = await fetch(`/api/share/${token}/recordings/${p.id}?name=${encodeURIComponent(name)}`, { method: "POST", body: form });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? "Couldn't save the recording");
    setRecs((x) => ({ ...x, [p.id]: j.recording }));
    if (i < book.pages.length - 1) setI(i + 1);
  };

  return (
    <main className="record-page">
      <header>
        <h1>Read “{book.title}” aloud</h1>
        <p className="hint">Record each page in your own voice. The family will hear it when they read the book. {done} of {book.pages.length} pages recorded.</p>
        <input id="recorder-name" placeholder="Your name, e.g. Grandpa Joe" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
      </header>
      <div className="record-stage" style={{ width: w, height: (w * d.height) / d.width }}>
        <PageStage book={book} page={p} scale={w / d.width} />
      </div>
      <div className="record-nav">
        <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>‹ Back</button>
        <strong>{i === 0 ? "Cover" : `Page ${i}`} {recs[p.id] ? "✓" : ""}</strong>
        <button className="btn ghost" disabled={i === book.pages.length - 1} onClick={() => setI(i + 1)}>Next ›</button>
      </div>
      <Recorder key={p.id} existingUrl={recs[p.id]?.url} onSave={save} label="Record this page" />
    </main>
  );
}
