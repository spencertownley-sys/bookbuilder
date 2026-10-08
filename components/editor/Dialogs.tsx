"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import PageStage from "./PageStage";
import type { Services } from "./Panels";
import { useCurrent, useStore } from "@/lib/store";
import { Book, fillTokens, pageDims, TextEl } from "@/lib/book";

const HeroForm = dynamic(() => import("../HeroForm"), { ssr: false });

export function HeroDialog({ services, onClose }: { services: Services; onClose: () => void }) {
  const { book } = useCurrent();
  const setHero = useStore((s) => s.setHero);
  if (!book) return null;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="hero-title">
        <div className="insp-head">
          <h3 id="hero-title">⭐ Star your child</h3>
          <button className="icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="hint">Changes the name, pronouns and look on every page at once. You can undo it.</p>
        <HeroForm
          initial={book.hero}
          submitLabel="Update every page"
          onCancel={onClose}
          uploadPhoto={services.uploadImage}
          onSubmit={(h) => {
            setHero(h);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

export type RecordingMap = Record<string, { url: string; by?: string | null }>;

/** Full-screen flipbook. Plays family voice recordings when they exist, otherwise reads aloud. */
export function Preview({ onClose, recordings, bookOverride }: { onClose: () => void; recordings: RecordingMap; bookOverride?: Book }) {
  const current = useCurrent().book;
  const book = bookOverride ?? current;
  return book ? <Flipbook book={book} recordings={recordings} onClose={onClose} /> : null;
}

export function Flipbook({
  book, recordings, onClose, footer,
}: {
  book: Book;
  recordings: RecordingMap;
  onClose?: () => void;
  footer?: (pageId: string) => React.ReactNode;
}) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [box, setBox] = useState({ w: 600, h: 600 });
  const audio = useRef<HTMLAudioElement | null>(null);
  const touchX = useRef(0);

  useLayoutEffect(() => {
    const f = () => setBox({ w: window.innerWidth - 32, h: window.innerHeight - (footer ? 230 : 150) });
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, [footer]);

  const stop = () => {
    audio.current?.pause();
    window.speechSynthesis?.cancel();
    setPlaying(false);
  };
  useEffect(() => () => stop(), []);

  const p = book.pages[i];
  const rec = recordings[p.id];

  const play = () => {
    stop();
    setAutoplay(true);
    if (rec) {
      const a = new Audio(rec.url);
      audio.current = a;
      a.onended = () => setPlaying(false);
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      return;
    }
    const text = p.elements.filter((e): e is TextEl => e.type === "text").map((e) => fillTokens(e.text, book.hero)).join(". ");
    if (!text || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.pitch = 1.1;
    u.onend = () => setPlaying(false);
    setPlaying(true);
    window.speechSynthesis.speak(u);
  };

  // Once someone presses play, keep narrating as pages turn.
  useEffect(() => {
    if (autoplay) play();
    else stop();
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (n: number) => setI(Math.max(0, Math.min(book.pages.length - 1, n)));
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const d = pageDims(book.trim);
  const scale = Math.min(box.w / d.width, box.h / d.height);
  return (
    <div
      className="preview"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (dx < -40) go(i + 1);
        if (dx > 40) go(i - 1);
      }}
    >
      <div className="preview-top">
        <strong>{book.title}</strong>
        <span className="hint light">{i === 0 ? "Cover" : `Page ${i} of ${book.pages.length - 1}`}</span>
        {onClose && <button className="icon light" onClick={onClose} aria-label="Close">✕</button>}
      </div>
      <div key={p.id} className="flip-in" style={{ width: d.width * scale, height: d.height * scale }}>
        <PageStage book={book} page={p} scale={scale} />
      </div>
      <div className="preview-nav">
        <button className="btn ghost light" disabled={i === 0} onClick={() => go(i - 1)}>‹ Back</button>
        <button className="btn primary" onClick={() => (playing ? (setAutoplay(false), stop()) : play())}>
          {playing ? "⏸ Pause" : rec ? `▶ Hear ${rec.by ? rec.by : "the recording"}` : "🔊 Read to me"}
        </button>
        <button className="btn ghost light" disabled={i === book.pages.length - 1} onClick={() => go(i + 1)}>Next ›</button>
      </div>
      {footer?.(p.id)}
    </div>
  );
}
