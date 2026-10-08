"use client";
import { useEffect, useRef, useState } from "react";

const MAX_MS = 60_000;

function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) if (MediaRecorder.isTypeSupported(m)) return m;
  return "";
}

/** Record up to 60 seconds of narration, listen back, then save or re-record. */
export default function Recorder({ existingUrl, onSave, label = "Record this page" }: {
  existingUrl?: string;
  label?: string;
  onSave: (blob: Blob, durationMs: number) => Promise<void>;
}) {
  const [state, setState] = useState<"idle" | "recording" | "review" | "saving">("idle");
  const [ms, setMs] = useState(0);
  const [take, setTake] = useState<{ blob: Blob; url: string; ms: number } | null>(null);
  const [err, setErr] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const started = useRef(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (tick.current) clearInterval(tick.current);
    rec.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);
  useEffect(() => () => {
    if (take) URL.revokeObjectURL(take.url);
  }, [take]);

  const start = async () => {
    setErr("");
    const mime = pickMime();
    if (mime === null || !navigator.mediaDevices?.getUserMedia) return setErr("This browser can't record audio. Try Chrome or Safari.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const r = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 64000 } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (tick.current) clearInterval(tick.current);
        const dur = Math.min(MAX_MS, Date.now() - started.current);
        const blob = new Blob(chunks, { type: (r.mimeType || mime || "audio/webm").split(";")[0] });
        setTake({ blob, url: URL.createObjectURL(blob), ms: dur });
        setState("review");
      };
      rec.current = r;
      started.current = Date.now();
      setMs(0);
      r.start(250);
      setState("recording");
      tick.current = setInterval(() => {
        const t = Date.now() - started.current;
        setMs(t);
        if (t >= MAX_MS) r.stop();
      }, 200);
    } catch {
      setErr("Microphone access was blocked. Allow the microphone in your browser settings and try again.");
    }
  };

  const secs = Math.floor(ms / 1000);
  return (
    <div className="recorder">
      {state === "idle" && (
        <>
          {existingUrl && <audio controls src={existingUrl} preload="none" />}
          <button type="button" className="btn primary" onClick={start}>🎙 {existingUrl ? "Record again" : label}</button>
        </>
      )}
      {state === "recording" && (
        <div className="rec-live">
          <span className="rec-dot" aria-hidden /> Recording… {secs}s / 60s
          <button type="button" className="btn primary" onClick={() => rec.current?.stop()}>■ Stop</button>
        </div>
      )}
      {(state === "review" || state === "saving") && take && (
        <div className="rec-review">
          <audio controls src={take.url} />
          <div className="form-actions">
            <button type="button" className="btn ghost" disabled={state === "saving"} onClick={() => (setTake(null), setState("idle"))}>Discard</button>
            <button type="button" className="btn primary" disabled={state === "saving"} onClick={async () => {
              setState("saving");
              try {
                await onSave(take.blob, take.ms);
                setTake(null);
                setState("idle");
              } catch (e) {
                setErr((e as Error).message);
                setState("review");
              }
            }}>{state === "saving" ? "Saving…" : "Save recording"}</button>
          </div>
        </div>
      )}
      {err && <p className="err" role="alert">{err}</p>}
    </div>
  );
}
