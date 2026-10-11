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

  const [err, setErr] = useState("");

  useEffect(() => {
    fetch(`/api/books/${bookId}/share`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setToken(j.links?.find((l: { kind: Kind; token: string }) => l.kind === kind)?.token ?? null);
      })
      .catch(() => (setErr("Couldn't check this link. Reload to try again."), setToken(null)));
  }, [bookId, kind]);

  const url = token ? `${location.origin}/${kind === "read" ? "read" : "record"}/${token}` : "";
  const guarded = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };
  const create = () =>
    guarded(async () => {
      const j = await postJson<{ link: { token: string } }>(`/api/books/${bookId}/share`, { kind });
      setToken(j.link.token);
    });
  const off = () =>
    guarded(async () => {
      await postJson(`/api/books/${bookId}/share`, { kind }, "DELETE");
      setToken(null);
      setConfirmOff(false);
    });
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
      {err && <p className="err" role="alert">{err}</p>}
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
          <NoteItem key={n.id} bookId={bookId} note={n} where={pageLabel(n.page_id)} onGo={() => onGoToPage(n.page_id)} onChanged={onChanged} />
        ))}
      </ul>
    </div>
  );
}

function NoteItem({ bookId, note: n, where, onGo, onChanged }: { bookId: string; note: FamilyData["notes"][number]; where: string; onGo: () => void; onChanged: () => void }) {
  const [confirm, setConfirm] = useState<null | "remove" | "report">(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const act = async (report: boolean) => {
    setBusy(true);
    setErr("");
    try {
      await postJson(`/api/books/${bookId}/notes/${n.id}`, { report }, "DELETE");
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <li>
      <button className="link-btn" onClick={onGo}>
        {n.kind === "heart" ? "❤️" : "💬"} <b>{n.author_name || "Someone"}</b> on {where}
      </button>
      {n.body && <p>{n.body}</p>}
      {confirm ? (
        <div className="note-actions">
          <span className="fineprint">{confirm === "report" ? "Report this note to us and remove it?" : "Remove this note?"}</span>
          <button className="btn ghost small" disabled={busy} onClick={() => setConfirm(null)}>Keep</button>
          <button className="btn danger small" disabled={busy} onClick={() => act(confirm === "report")}>{confirm === "report" ? "Report" : "Remove"}</button>
        </div>
      ) : (
        <div className="note-actions">
          <button className="link-btn small" onClick={() => setConfirm("remove")}>Remove</button>
          {n.kind === "note" && <button className="link-btn small" onClick={() => setConfirm("report")}>Report</button>}
        </div>
      )}
      {err && <p className="err" role="alert">{err}</p>}
    </li>
  );
}
