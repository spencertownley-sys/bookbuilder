"use client";
import { useEffect, useState } from "react";
import Recorder from "../Recorder";
import { useCurrent } from "@/lib/store";
import { postJson } from "@/lib/api";
import type { RecordingMap } from "./Dialogs";

export interface FamilyData {
  notes: { id: number; page_id: string; kind: "heart" | "note"; author_name: string | null; body: string | null; created_at: string }[];
  recordings: RecordingMap;
}

type Kind = "read" | "record";

function LinkCard({ bookId, kind, title, help }: { bookId: string; kind: Kind; title: string; help: string }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  useEffect(() => {
    fetch(`/api/books/${bookId}/share`).then(async (r) => {
      const j = await r.json();
      setToken(j.links?.find((l: { kind: Kind; token: string }) => l.kind === kind)?.token ?? null);
    });
  }, [bookId, kind]);

  const url = token ? `${location.origin}/${kind === "read" ? "read" : "record"}/${token}` : "";
  const create = async () => {
    setBusy(true);
    const j = await postJson<{ link: { token: string } }>(`/api/books/${bookId}/share`, { kind });
    setToken(j.link.token);
    setBusy(false);
  };
  const off = async () => {
    setBusy(true);
    await postJson(`/api/books/${bookId}/share`, { kind }, "DELETE");
    setToken(null);
    setConfirmOff(false);
    setBusy(false);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      (document.getElementById(`link-${kind}`) as HTMLInputElement | null)?.select();
    }
  };

  return (
    <div className="link-card">
      <strong>{title}</strong>
      <p className="hint">{help}</p>
      {token === undefined && <p className="hint">Checking…</p>}
      {token === null && <button className="btn primary wide" disabled={busy} onClick={create}>{busy ? "Creating…" : "Create link"}</button>}
      {token && (
        <>
          <input id={`link-${kind}`} className="link-input" readOnly value={url} onFocus={(e) => e.target.select()} />
          <div className="form-actions">
            <button className="btn primary" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
            <a className="btn ghost" href={url} target="_blank" rel="noreferrer">Open</a>
            {confirmOff ? (
              <button className="btn danger" disabled={busy} onClick={off}>Turn off now</button>
            ) : (
              <button className="btn ghost" onClick={() => setConfirmOff(true)}>Turn off</button>
            )}
          </div>
          {confirmOff && <p className="fineprint">Anyone with this link will lose access right away.</p>}
        </>
      )}
    </div>
  );
}

export default function FamilyPanel({ bookId, family, onChanged, onGoToPage }: { bookId: string; family: FamilyData; onChanged: () => void; onGoToPage: (pageId: string) => void }) {
  const { book, page } = useCurrent();
  const [name, setName] = useState("");
  if (!book || !page) return null;
  const pageIndex = book.pages.findIndex((p) => p.id === page.id);
  const pageLabel = (id: string) => {
    const i = book.pages.findIndex((p) => p.id === id);
    return i < 0 ? "a removed page" : i === 0 ? "the cover" : `page ${i}`;
  };
  const rec = family.recordings[page.id];

  const saveRecording = async (blob: Blob, ms: number) => {
    const form = new FormData();
    form.append("audio", blob, "voice");
    form.append("durationMs", String(ms));
    const r = await fetch(`/api/books/${bookId}/recordings/${page.id}?name=${encodeURIComponent(name)}`, { method: "POST", body: form });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? "Couldn't save the recording");
    onChanged();
  };

  return (
    <div className="panel-pad">
      <h3>💌 Family</h3>
      <LinkCard bookId={bookId} kind="read" title="Share to read" help="A private flipbook link. Anyone with it can read the book, hear recordings and leave hearts and notes. No sign-in needed." />

      <h4>Voice for {pageIndex === 0 ? "the cover" : `page ${pageIndex}`}</h4>
      <input placeholder="Who's reading? e.g. Grandma" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Reader's name" />
      <Recorder key={page.id} existingUrl={rec?.url} onSave={saveRecording} />
      {rec?.by && <p className="fineprint">Recorded by {rec.by}.</p>}
      <p className="hint">{Object.keys(family.recordings).length} of {book.pages.length} pages have a recording.</p>

      <LinkCard bookId={bookId} kind="record" title="Invite someone to record" help="Send this to a grandparent: they can record narration for any page from their phone." />

      <h4>Notes from family</h4>
      {family.notes.length === 0 && <p className="hint">Hearts and notes from your share link will show up here.</p>}
      <ul className="notes">
        {family.notes.slice(0, 50).map((n) => (
          <li key={n.id}>
            <button className="link-btn" onClick={() => onGoToPage(n.page_id)}>
              {n.kind === "heart" ? "❤️" : "💬"} <b>{n.author_name || "Someone"}</b> on {pageLabel(n.page_id)}
            </button>
            {n.body && <p>{n.body}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
