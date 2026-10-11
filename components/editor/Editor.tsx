"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type Konva from "konva";
import PageStage from "./PageStage";
import Inspector from "./Inspector";
import { PANEL_TABS, PanelBody, PanelId, Services } from "./Panels";
import FamilyPanel, { FamilyData } from "./FamilyPanel";
import PrintDialog from "./PrintDialog";
import { HeroDialog, Preview } from "./Dialogs";
import { useCurrent, useStore } from "@/lib/store";
import { TextEl, pageDims } from "@/lib/book";
import { checkBook, Issue, summarize } from "@/lib/checks";
import type { Plan } from "@/lib/plans";
import type { SaveStatus } from "@/lib/sync";
import { postJson } from "@/lib/api";

export interface CloudInfo {
  bookId: string;
  status: SaveStatus;
  error: string | null;
  keepsakeUnlocked: boolean;
  setKeepsake: (v: boolean) => void;
  reload: () => Promise<boolean>;
  saveNow: () => Promise<void>;
  keepMine: () => Promise<void>;
}

export interface EditorProps {
  plan: Plan;
  services: Services;
  shelfHref?: string;
  pricingHref?: string;
  cloud?: CloudInfo; // present in the real app; absent in the standalone demo
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

const SAVE_LABEL: Record<SaveStatus, string> = {
  loading: "Opening…",
  saved: "Saved",
  saving: "Saving…",
  unsaved: "Saving…",
  offline: "Offline, will retry",
  conflict: "Changed elsewhere",
  error: "Not saved",
};

export default function Editor({ plan, services, shelfHref = "/dashboard", pricingHref = "/pricing", cloud }: EditorProps) {
  const { book, page } = useCurrent();
  const s = useStore();
  const mobile = useIsMobile();
  const [panel, setPanel] = useState<PanelId | null>("backgrounds");
  const [guides, setGuides] = useState(true);
  const [editing, setEditing] = useState<TextEl | null>(null);
  const [preview, setPreview] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [heroOpen, setHeroOpen] = useState(false);
  const [upsell, setUpsell] = useState<string | null>(null);
  const [scale, setScale] = useState(0.5);
  const [family, setFamily] = useState<FamilyData>({ notes: [], recordings: {} });
  const [toast, setToast] = useState("");
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const loadFamily = useCallback(async () => {
    if (!cloud) return;
    const r = await fetch(`/api/books/${cloud.bookId}/family`);
    if (r.ok) setFamily(await r.json());
  }, [cloud?.bookId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  // Back from checkout: confirm the payment with the server, then show the book's real unlock state.
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get("unlocked") && cloud) {
      const sid = q.get("session_id");
      (async () => {
        if (sid) await postJson("/api/checkout/confirm", { sessionId: sid }).catch(() => null);
        const j = await fetch(`/api/books/${cloud.bookId}`).then((r) => r.json()).catch(() => null);
        if (j?.keepsakeUnlocked) {
          cloud.setKeepsake(true);
          setToast("Unlocked! This book now exports print-ready with no watermark.");
        } else setToast("Payment received. The unlock can take a minute; reload the page if it hasn't appeared.");
      })();
    }
    if (q.get("order") === "canceled") setToast("Checkout was canceled. Nothing was charged.");
    if (q.has("unlocked") || q.has("order")) history.replaceState(null, "", location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // On phones the side panel starts closed so the page gets the screen.
  useEffect(() => {
    if (mobile) setPanel(null);
  }, [mobile]);

  // A brand-new book from a blank start with no hero name: ask once.
  useEffect(() => {
    if (book && cloud && !book.hero?.name && book.pages.some((p) => p.elements.some((e) => e.type === "text" && /\{name\}/i.test(e.text))))
      setHeroOpen(true);
  }, [book?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live print check: re-run a moment after edits stop, so problems show before they cost money.
  useEffect(() => {
    if (!book) return;
    let alive = true;
    const t = setTimeout(() => checkBook(book).then((x) => alive && setIssues(x)).catch(() => {}), 1200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [book?.pages, book?.hero, book?.trim]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [d?.width, d?.height, mobile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts.
  const dialogOpen = preview || printOpen || heroOpen || !!upsell;
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (dialogOpen || t.closest("input, textarea, select, [contenteditable]")) return; // never edit the page behind a dialog
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
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
    [s, page, dialogOpen],
  );
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  if (!book || !page || !d) return <div className="loading">Opening your book…</div>;

  const selected = page.elements.find((e) => e.id === s.selectedId);
  const pageIndex = book.pages.findIndex((p) => p.id === page.id);
  const pageLimit = cloud?.keepsakeUnlocked ? Math.max(24, plan.limits.pagesPerBook) : plan.limits.pagesPerBook;
  const atPageLimit = book.pages.length >= pageLimit;
  const tabs = PANEL_TABS.filter((t) => t.id !== "family" || cloud);
  const notesByPage = family.notes.reduce<Record<string, number>>((a, n) => ((a[n.page_id] = (a[n.page_id] ?? 0) + 1), a), {});
  const check = summarize(issues);

  return (
    <div className={"editor" + (mobile ? " mobile" : "")}>
      <header className="topbar">
        <a href={shelfHref} className="logo-sm" aria-label="Back to my books">📚</a>
        <input className="title-input" value={book.title} onChange={(e) => s.updateBookMeta({ title: e.target.value })} aria-label="Book title" />
        {cloud &&
          (cloud.status === "error" || cloud.status === "offline" ? (
            <button className={"save-pill " + cloud.status} onClick={() => cloud.saveNow()} title={cloud.error ?? "Tap to try saving again"}>
              {SAVE_LABEL[cloud.status]} · retry
            </button>
          ) : (
            <span className={"save-pill " + cloud.status} role="status" title={cloud.error ?? undefined}>
              {SAVE_LABEL[cloud.status]}
            </span>
          ))}
        {check && (
          <button
            className={"check-chip " + (check.block ? "block" : check.warn ? "warn" : "ok")}
            onClick={() => setPrintOpen(true)}
            title="Print check: problems the printer would notice"
            aria-label={check.block ? `${check.block} print problems to fix` : check.warn ? `${check.warn} print warnings` : "Print check passed"}
          >
            {check.block ? `⛔ ${check.block}${mobile ? "" : " to fix"}` : check.warn ? `⚠️ ${check.warn}${mobile ? "" : " to check"}` : `✓${mobile ? "" : " Print-ready"}`}
          </button>
        )}
        <div className="top-actions">
          <button className="icon" onClick={s.undo} title="Undo (Ctrl+Z)" aria-label="Undo">↶</button>
          <button className="icon" onClick={s.redo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">↷</button>
          {!mobile && (
            <label className="toggle" title="Show trim & safe-area lines">
              <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} /> Guides
            </label>
          )}
          <button className="btn ghost hero-btn" onClick={() => setHeroOpen(true)} title="Star your child">⭐ {mobile ? "" : book.hero?.name || "Star your child"}</button>
          <button className="btn ghost" onClick={() => setPreview(true)} aria-label="Read it">▶ {mobile ? "" : "Read it"}</button>
          <button className="btn primary" onClick={() => setPrintOpen(true)}>{mobile ? "Print" : "Print & publish"}</button>
        </div>
      </header>

      {cloud?.status === "conflict" && (
        <div className="banner" role="alert">
          <span>This book was changed on another device.</span>
          <span className="banner-actions">
            <button className="btn small primary" onClick={() => cloud.reload()}>Load the latest version</button>
            <button className="btn small ghost" onClick={() => cloud.keepMine()} title="Save this copy over the other device's changes">Keep my version</button>
          </span>
        </div>
      )}

      <nav className="rail">
        {tabs.map((t) => (
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
          {panel === "family" && cloud ? (
            <FamilyPanel bookId={cloud.bookId} family={family} onChanged={loadFamily} onGoToPage={(id) => s.selectPage(id)} />
          ) : (
            <PanelBody id={panel} plan={plan} services={services} onUpsell={setUpsell} />
          )}
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
        {page.elements.length === 0 && !page.background && <div className="empty-hint">Pick a scene, then add characters and words ✨</div>}
      </main>

      {selected && (!mobile || !panel) && (
        <aside className={mobile ? "inspector-sheet" : "inspector-side"}>
          <Inspector onClose={() => s.select(null)} onEditHero={() => setHeroOpen(true)} />
        </aside>
      )}

      <footer className="pages">
        {book.pages.map((p, i) => (
          <div key={p.id} className={"page-thumb" + (p.id === page.id ? " on" : "")}>
            <button onClick={() => s.selectPage(p.id)} aria-label={i === 0 ? "Cover" : `Page ${i}`}>
              <PageStage book={book} page={p} scale={56 / d.height} />
            </button>
            <span className="pnum">
              {i === 0 ? "Cover" : i}
              {check?.pages.has(i) && <span className="thumb-flag" title="Print check found something on this page"> ⚠️</span>}
              {family.recordings[p.id] && <span title="Has a voice recording"> 🎙</span>}
              {notesByPage[p.id] ? <span title="Family reactions"> 💌{notesByPage[p.id]}</span> : null}
            </span>
            {p.id === page.id && (
              <div className="page-tools">
                <button onClick={() => s.movePage(p.id, -1)} title="Move left" aria-label="Move page left">‹</button>
                <button onClick={() => (atPageLimit ? setUpsell(`Your plan allows ${pageLimit} pages`) : s.duplicatePage(p.id))} title="Duplicate page" aria-label="Duplicate page">⧉</button>
                <button onClick={() => s.deletePage(p.id)} title="Delete page" aria-label="Delete page">🗑</button>
                <button onClick={() => s.movePage(p.id, 1)} title="Move right" aria-label="Move page right">›</button>
              </div>
            )}
          </div>
        ))}
        <button className="add-page" onClick={() => (atPageLimit ? setUpsell(`Your plan allows ${pageLimit} pages`) : s.addPage(page.id))}>
          + Page
        </button>
        <span className="page-count">{pageIndex === 0 ? "Cover" : `Page ${pageIndex}`} · {book.pages.length} total</span>
      </footer>

      {preview && <Preview recordings={family.recordings} onClose={() => setPreview(false)} />}
      {heroOpen && <HeroDialog services={services} onClose={() => setHeroOpen(false)} />}
      {printOpen && <PrintDialog plan={plan} cloud={cloud} onClose={() => setPrintOpen(false)} onUpsell={setUpsell} />}
      {upsell && (
        <div className="modal-back" onClick={() => setUpsell(null)}>
          <div className="modal small" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="upsell-emoji">🌟</div>
            <h3>{upsell}</h3>
            <p>Storyteller is $4.99/month: every character, 60 AI illustrations, print-ready files and no watermark. Or unlock just this book for $6.</p>
            <a className="btn primary wide" href={pricingHref}>See plans</a>
            <button className="btn ghost wide" onClick={() => setUpsell(null)}>Maybe later</button>
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function InlineText({ el, scale, onChange, onDone, onCheckpoint }: { el: TextEl; scale: number; onChange: (t: string) => void; onDone: () => void; onCheckpoint: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    onCheckpoint();
    ref.current?.focus();
    ref.current?.select();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!el) return null;
  const pad = el.bubble ? 24 : el.backdrop ? 22 : 0;
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
