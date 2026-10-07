"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type Konva from "konva";
import PageStage from "./PageStage";
import Inspector from "./Inspector";
import { PANEL_TABS, PanelBody, PanelId, Services } from "./Panels";
import { useCurrent, useStore } from "@/lib/store";
import { TextEl, TRIM_SIZES, pageDims } from "@/lib/book";
import type { Plan } from "@/lib/plans";
import { exportCoverPdf, exportInteriorPdf, exportPagePng } from "@/lib/export";
import { PUBLISHERS } from "@/lib/publishers";

export interface EditorProps {
  plan: Plan;
  services: Services;
  shelfHref?: string;
  pricingHref?: string;
  onPrintOrder?: () => void;
}

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 820px)");
    const f = () => setM(q.matches);
    f();
    q.addEventListener("change", f);
    return () => q.removeEventListener("change", f);
  }, []);
  return m;
}

export default function Editor({ plan, services, shelfHref = "/dashboard", pricingHref = "/pricing", onPrintOrder }: EditorProps) {
  const { book, page } = useCurrent();
  const s = useStore();
  const mobile = useIsMobile();
  const [panel, setPanel] = useState<PanelId | null>("backgrounds");
  const [guides, setGuides] = useState(true);
  const [editing, setEditing] = useState<TextEl | null>(null);
  const [preview, setPreview] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [upsell, setUpsell] = useState<string | null>(null);
  const [scale, setScale] = useState(0.5);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // On phones the side panel starts closed so the page gets the screen.
  useEffect(() => {
    if (mobile) setPanel(null);
  }, [mobile]);

  // Fit the page to the available space.
  const d = book ? pageDims(book.trim) : null;
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el || !d) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const pad = mobile ? 16 : 48;
      setScale(Math.max(0.1, Math.min((r.width - pad) / d.width, (r.height - pad) / d.height)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [d?.width, d?.height, mobile]);

  // Keyboard shortcuts.
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? s.redo() : s.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        s.redo();
      } else if (mod && e.key.toLowerCase() === "d" && s.selectedId) {
        e.preventDefault();
        s.duplicateElement(s.selectedId);
      } else if ((e.key === "Delete" || e.key === "Backspace") && s.selectedId) {
        e.preventDefault();
        s.deleteElement(s.selectedId);
      } else if (e.key === "Escape") s.select(null);
      else if (s.selectedId && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const el = page?.elements.find((x) => x.id === s.selectedId);
        if (!el) return;
        const step = e.shiftKey ? 20 : 4;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        s.updateElement(el.id, { x: el.x + dx, y: el.y + dy });
      }
    },
    [s, page],
  );
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  if (!book || !page || !d) return <div className="loading">Opening your book…</div>;

  const selected = page.elements.find((e) => e.id === s.selectedId);
  const pageIndex = book.pages.findIndex((p) => p.id === page.id);
  const atPageLimit = book.pages.length >= plan.limits.pagesPerBook;

  return (
    <div className={"editor" + (mobile ? " mobile" : "")}>
      <header className="topbar">
        <a href={shelfHref} className="logo-sm" aria-label="Back to my books">📚</a>
        <input className="title-input" value={book.title} onChange={(e) => s.updateBookMeta({ title: e.target.value })} aria-label="Book title" />
        <div className="top-actions">
          <button className="icon" onClick={s.undo} title="Undo (Ctrl+Z)">↶</button>
          <button className="icon" onClick={s.redo} title="Redo (Ctrl+Shift+Z)">↷</button>
          {!mobile && (
            <label className="toggle" title="Show trim & safe-area lines">
              <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} /> Guides
            </label>
          )}
          <button className="btn ghost" onClick={() => setPreview(true)}>▶ {mobile ? "" : "Read it"}</button>
          <button className="btn primary" onClick={() => setExportOpen(true)}>{mobile ? "Share" : "Export & publish"}</button>
        </div>
      </header>

      <nav className="rail">
        {PANEL_TABS.map((t) => (
          <button key={t.id} className={panel === t.id ? "on" : ""} onClick={() => setPanel(panel === t.id ? null : t.id)}>
            <span className="ri">{t.icon}</span>
            <span className="rl">{t.label}</span>
          </button>
        ))}
      </nav>

      {panel && (
        <aside className="panel">
          {mobile && (
            <div className="sheet-grab" onClick={() => setPanel(null)}>
              <span />
            </div>
          )}
          <PanelBody id={panel} plan={plan} services={services} onUpsell={setUpsell} />
        </aside>
      )}

      <main className="canvas-wrap" ref={wrapRef}>
        <div className="page-shadow" style={{ width: d.width * scale, height: d.height * scale }}>
          <PageStage
            ref={stageRef}
            book={book}
            page={page}
            scale={scale}
            interactive
            showGuides={guides && !mobile}
            selectedId={s.selectedId}
            onSelect={(id) => {
              s.select(id);
              if (id && mobile) setPanel(null);
            }}
            onChange={(id, patch) => s.updateElement(id, patch)}
            onEditText={(el) => setEditing(el)}
            editingId={editing?.id}
          />
          {editing && (
            <InlineText
              el={page.elements.find((e) => e.id === editing.id) as TextEl}
              scale={scale}
              onCheckpoint={() => s.updateElement(editing.id, {}, true)}
              onChange={(text) => s.updateElement(editing.id, { text }, false)}
              onDone={() => setEditing(null)}
            />
          )}
        </div>
        {page.elements.length === 0 && !page.background && (
          <div className="empty-hint">Pick a scene, then add characters and words ✨</div>
        )}
      </main>

      {selected && (!mobile || !panel) && (
        <aside className={mobile ? "inspector-sheet" : "inspector-side"}>
          <Inspector onClose={() => s.select(null)} />
        </aside>
      )}

      <footer className="pages">
        {book.pages.map((p, i) => (
          <div key={p.id} className={"page-thumb" + (p.id === page.id ? " on" : "")}>
            <button onClick={() => s.selectPage(p.id)} aria-label={`Page ${i + 1}`}>
              <PageStage book={book} page={p} scale={56 / d.height} />
            </button>
            <span className="pnum">{i === 0 ? "Cover" : i}</span>
            {p.id === page.id && (
              <div className="page-tools">
                <button onClick={() => s.movePage(p.id, -1)} title="Move left">‹</button>
                <button onClick={() => (atPageLimit ? setUpsell(`Your plan allows ${plan.limits.pagesPerBook} pages`) : s.duplicatePage(p.id))} title="Duplicate page">⧉</button>
                <button onClick={() => s.deletePage(p.id)} title="Delete page">🗑</button>
                <button onClick={() => s.movePage(p.id, 1)} title="Move right">›</button>
              </div>
            )}
          </div>
        ))}
        <button className="add-page" onClick={() => (atPageLimit ? setUpsell(`Your plan allows ${plan.limits.pagesPerBook} pages`) : s.addPage(page.id))}>
          + Page
        </button>
        <span className="page-count">{pageIndex === 0 ? "Cover" : `Page ${pageIndex}`} · {book.pages.length} total</span>
      </footer>

      {preview && <Preview onClose={() => setPreview(false)} />}
      {exportOpen && <ExportDialog plan={plan} onClose={() => setExportOpen(false)} onUpsell={setUpsell} onPrintOrder={onPrintOrder} />}
      {upsell && (
        <div className="modal-back" onClick={() => setUpsell(null)}>
          <div className="modal small" onClick={(e) => e.stopPropagation()}>
            <div className="upsell-emoji">🌟</div>
            <h3>{upsell}</h3>
            <p>Storyteller is $4.99/month — every character, 60 AI illustrations, print-ready files and no watermark.</p>
            <a className="btn primary wide" href={pricingHref}>See plans</a>
            <button className="btn ghost wide" onClick={() => setUpsell(null)}>Maybe later</button>
          </div>
        </div>
      )}
    </div>
  );
}

function InlineText({ el, scale, onChange, onDone, onCheckpoint }: { el: TextEl; scale: number; onChange: (t: string) => void; onDone: () => void; onCheckpoint: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    onCheckpoint();
    ref.current?.focus();
    ref.current?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!el) return null;
  const pad = el.bubble ? 24 : 0;
  return (
    <textarea
      ref={ref}
      className="inline-text"
      value={el.text}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onDone}
      onKeyDown={(e) => e.key === "Escape" && onDone()}
      style={{
        left: el.x * scale,
        top: el.y * scale,
        width: el.width * scale + pad * 2 * scale,
        fontFamily: el.fontFamily,
        fontSize: el.fontSize * scale,
        fontWeight: el.bold ? 700 : 400,
        fontStyle: el.italic ? "italic" : "normal",
        textAlign: el.align,
        color: el.fill,
        lineHeight: el.lineHeight,
        padding: pad * scale,
        transform: `rotate(${el.rotation}deg)`,
      }}
    />
  );
}

function Preview({ onClose }: { onClose: () => void }) {
  const { book } = useCurrent();
  const [i, setI] = useState(0);
  const [reading, setReading] = useState(false);
  const [box, setBox] = useState({ w: 600, h: 600 });
  useLayoutEffect(() => {
    const f = () => setBox({ w: window.innerWidth - 32, h: window.innerHeight - 140 });
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  if (!book) return null;
  const d = pageDims(book.trim);
  const scale = Math.min(box.w / d.width, box.h / d.height);
  const p = book.pages[i];
  const readAloud = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const text = p.elements.filter((e): e is TextEl => e.type === "text").map((e) => e.text).join(". ");
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.pitch = 1.1;
    u.onend = () => setReading(false);
    setReading(true);
    synth.speak(u);
  };
  let touchX = 0;
  return (
    <div className="preview" onTouchStart={(e) => (touchX = e.touches[0].clientX)} onTouchEnd={(e) => {
      const dx = e.changedTouches[0].clientX - touchX;
      if (dx < -40) setI(Math.min(book.pages.length - 1, i + 1));
      if (dx > 40) setI(Math.max(0, i - 1));
    }}>
      <div className="preview-top">
        <strong>{book.title}</strong>
        <button className="icon light" onClick={onClose}>✕</button>
      </div>
      <div key={p.id} className="flip-in" style={{ width: d.width * scale, height: d.height * scale }}>
        <PageStage book={book} page={p} scale={scale} />
      </div>
      <div className="preview-nav">
        <button className="btn ghost light" disabled={i === 0} onClick={() => setI(i - 1)}>‹ Back</button>
        <button className="btn primary" onClick={readAloud}>{reading ? "🔊 Reading…" : "🔊 Read to me"}</button>
        <button className="btn ghost light" disabled={i === book.pages.length - 1} onClick={() => setI(i + 1)}>Next ›</button>
      </div>
    </div>
  );
}

function ExportDialog({ plan, onClose, onUpsell, onPrintOrder }: { plan: Plan; onClose: () => void; onUpsell: (w: string) => void; onPrintOrder?: () => void }) {
  const { book, page } = useCurrent();
  const s = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [blurb, setBlurb] = useState("");
  if (!book || !page) return null;
  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      alert("Export failed: " + (e as Error).message);
    }
    setBusy(null);
  };
  const usesAI = book.usesAI || book.pages.some((p) => p.elements.some((e) => e.type === "image" && e.aiGenerated));
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="insp-head">
          <h3>Export & publish</h3>
          <button className="icon" onClick={onClose}>✕</button>
        </div>
        <label className="field">
          <span>Book size</span>
          <select value={book.trim} onChange={(e) => s.updateBookMeta({ trim: e.target.value })}>
            {TRIM_SIZES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Author name</span>
          <input value={book.author} onChange={(e) => s.updateBookMeta({ author: e.target.value })} placeholder="Your name" />
        </label>
        <div className="export-grid">
          <button className="btn primary" disabled={!!busy} onClick={() => run("Building PDF…", () => exportInteriorPdf(book, { dpi: plan.limits.printReadyPdf ? 300 : 150, watermark: plan.limits.watermark }))}>
            📄 {plan.limits.printReadyPdf ? "Print-ready interior PDF" : "Download PDF"}
          </button>
          <button className="btn ghost" disabled={!!busy} onClick={() => (plan.limits.printReadyPdf ? run("Building cover…", () => exportCoverPdf(book, blurb)) : onUpsell("Paperback cover files are on Storyteller"))}>
            📕 Paperback cover {plan.limits.printReadyPdf ? "" : "🔒"}
          </button>
          <button className="btn ghost" disabled={!!busy} onClick={() => run("Saving image…", () => exportPagePng(book, page, plan.limits.watermark))}>
            🖼 This page as an image
          </button>
          {onPrintOrder && (
            <button className="btn ghost" onClick={onPrintOrder}>📦 Order a printed copy</button>
          )}
        </div>
        {plan.limits.printReadyPdf && (
          <textarea rows={2} value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="Back-cover blurb (optional)" />
        )}
        {busy && <p className="hint">{busy}</p>}
        {usesAI && (
          <p className="notice">⚠️ This book contains AI-generated art. Amazon KDP and Apple Books require you to tick their AI-content disclosure box when you upload.</p>
        )}
        {book.pages.length < 24 && <p className="hint">Tip: KDP paperbacks need at least 24 pages; IngramSpark picture books usually 24–32.</p>}
        <h4>Publish it</h4>
        <div className="pub-list">
          {PUBLISHERS.map((p) => (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="pub">
              <strong>{p.name}</strong>
              <span>{p.bestFor}</span>
              {p.integration === "api" && <em>Built in</em>}
            </a>
          ))}
        </div>
        {!plan.limits.commercialLicense && <p className="fineprint">The free plan is for personal books. Selling a book needs Storyteller or Publisher.</p>}
      </div>
    </div>
  );
}
