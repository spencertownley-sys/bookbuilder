"use client";
import { useEffect, useMemo, useState } from "react";
import { useCurrent, useStore } from "@/lib/store";
import { TRIM_SIZES } from "@/lib/book";
import type { Plan } from "@/lib/plans";
import { buildCoverPdf, buildInteriorPdf, exportCoverPdf, exportInteriorPdf, exportPagePng } from "@/lib/export";
import { checkBook, Issue } from "@/lib/checks";
import { PUBLISHERS } from "@/lib/publishers";
import { FORMATS, PRINT_TRIM, PrintFormat, SHIPPING, ShipTo, ShippingLevel, money, printedPageCount, unitPriceCents, validateShipTo } from "@/lib/printing";
import { postJson, uploadPrintFile } from "@/lib/api";
import type { CloudInfo } from "./Editor";

const COUNTRIES: [string, string][] = [["US", "United States"], ["CA", "Canada"], ["GB", "United Kingdom"], ["AU", "Australia"], ["NZ", "New Zealand"], ["IE", "Ireland"], ["DE", "Germany"], ["FR", "France"], ["NL", "Netherlands"], ["MX", "Mexico"]];

function IssueList({ issues, accepted, setAccepted }: { issues: Issue[]; accepted: Set<string>; setAccepted: (s: Set<string>) => void }) {
  const s = useStore();
  const { book } = useCurrent();
  if (!issues.length) return <p className="ok-line">✓ Everything looks ready to print.</p>;
  return (
    <ul className="issues">
      {issues.map((i) => (
        <li key={i.id} className={"issue " + i.level}>
          <span className="issue-icon" aria-hidden>{i.level === "block" ? "⛔" : i.level === "warn" ? "⚠️" : "ℹ️"}</span>
          <span className="issue-text">
            {i.message}
            {i.page !== undefined && book && (
              <button className="link-btn" onClick={() => s.selectPage(book.pages[i.page!].id)}> Go to page</button>
            )}
          </span>
          {i.level === "warn" && (
            <label className="accept">
              <input type="checkbox" checked={accepted.has(i.id)} onChange={(e) => {
                const n = new Set(accepted);
                if (e.target.checked) n.add(i.id);
                else n.delete(i.id);
                setAccepted(n);
              }} /> OK as is
            </label>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function PrintDialog({ plan, cloud, onClose, onUpsell }: { plan: Plan; cloud?: CloudInfo; onClose: () => void; onUpsell: (w: string) => void }) {
  const { book, page } = useCurrent();
  const s = useStore();
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [blurb, setBlurb] = useState("");
  const [step, setStep] = useState<"main" | "order">("main");

  const pagesKey = book ? JSON.stringify([book.pages, book.hero, book.trim]) : "";
  useEffect(() => {
    if (book) checkBook(book).then(setIssues);
  }, [pagesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!book || !page) return null;
  const canPrint = plan.limits.printReadyPdf || !!cloud?.keepsakeUnlocked;
  const blocking = issues?.some((i) => i.level === "block");
  const unaccepted = issues?.filter((i) => i.level === "warn" && !accepted.has(i.id)).length ?? 0;
  const ready = issues !== null && !blocking && unaccepted === 0;

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(null);
  };

  const unlock = () =>
    run("Opening checkout…", async () => {
      const j = await postJson<{ url?: string; alreadyUnlocked?: boolean }>("/api/checkout", { addOnId: "keepsake", bookId: cloud!.bookId });
      if (j.alreadyUnlocked) cloud!.setKeepsake(true);
      else if (j.url) window.location.href = j.url;
    });

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="print-title">
        <div className="insp-head">
          <h3 id="print-title">{step === "order" ? "📦 Order a printed copy" : "Print & publish"}</h3>
          <button className="icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {step === "order" && cloud ? (
          <OrderForm cloud={cloud} ready={ready} onBack={() => setStep("main")} />
        ) : (
          <>
            <section className="print-section">
              <h4>Print check</h4>
              {issues === null ? <p className="hint">Checking every page…</p> : <IssueList issues={issues} accepted={accepted} setAccepted={setAccepted} />}
            </section>

            {cloud && (
              <section className="print-section order-callout">
                <div>
                  <h4>Hold it in your hands</h4>
                  <p className="hint">Hardcover from {money(unitPriceCents("hardcover", book.pages.length))} or paperback from {money(unitPriceCents("paperback", book.pages.length))}, printed and shipped to any address. Includes this book&apos;s Keepsake unlock.</p>
                </div>
                <button className="btn primary" onClick={() => setStep("order")}>Order a printed copy</button>
              </section>
            )}

            <section className="print-section">
              <h4>Download files</h4>
              <div className="field-row">
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
              </div>
              {!canPrint && (
                <div className="unlock-row">
                  <p className="hint">Free plan downloads are screen quality with a small watermark.</p>
                  {cloud && <button className="btn primary" disabled={!!busy} onClick={unlock}>Unlock this book: $6</button>}
                  <button className="btn ghost" onClick={() => onUpsell("Print-ready files for every book")}>See plans</button>
                </div>
              )}
              <div className="export-grid">
                <button className="btn primary" disabled={!!busy || blocking} onClick={() => run("Building PDF…", () => exportInteriorPdf(book, { dpi: canPrint ? 300 : 150, watermark: !canPrint, onProgress: (n, t) => setBusy(`Building page ${n} of ${t}…`) }))}>
                  📄 {canPrint ? "Print-ready interior PDF" : "Download PDF"}
                </button>
                <button className="btn ghost" disabled={!!busy || blocking} onClick={() => (canPrint ? run("Building cover…", () => exportCoverPdf(book, blurb)) : onUpsell("Paperback cover files come with an unlock"))}>
                  📕 Paperback cover (KDP) {canPrint ? "" : "🔒"}
                </button>
                <button className="btn ghost" disabled={!!busy} onClick={() => run("Saving image…", () => exportPagePng(book, page, !canPrint))}>🖼 This page as an image</button>
              </div>
              {canPrint && <textarea rows={2} value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="Back-cover blurb (optional)" />}
              {busy && <p className="hint" role="status">{busy}</p>}
              {err && <p className="err" role="alert">{err}</p>}
              {blocking && <p className="fineprint">Fix the ⛔ items above before downloading.</p>}
            </section>

            <section className="print-section">
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
            </section>
          </>
        )}
      </div>
    </div>
  );
}

interface QuoteRes {
  pages: number;
  unitCents: number;
  itemsCents: number;
  shippingCents: number;
  totalCents: number;
  shippingEstimated: boolean;
}

function OrderForm({ cloud, ready, onBack }: { cloud: CloudInfo; ready: boolean; onBack: () => void }) {
  const { book } = useCurrent();
  const s = useStore();
  const [format, setFormat] = useState<PrintFormat>("hardcover");
  const [qty, setQty] = useState(1);
  const [level, setLevel] = useState<ShippingLevel>("MAIL");
  const [ship, setShip] = useState<ShipTo>({ name: book?.hero?.name ?? "", street1: "", street2: "", city: "", state_code: "", postcode: "", country_code: "US", phone_number: "" });
  const [email, setEmail] = useState("");
  const [quote, setQuote] = useState<QuoteRes | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const set = (p: Partial<ShipTo>) => (setShip((x) => ({ ...x, ...p })), setQuote(null));
  const pages = book?.pages.length ?? 0;
  const printed = useMemo(() => printedPageCount(format, pages), [format, pages]);

  if (!book) return null;
  if (book.trim !== PRINT_TRIM)
    return (
      <div className="print-section">
        <p>Printed copies are 8.5&quot; × 8.5&quot; square. Your book is set to a different size.</p>
        <div className="form-actions">
          <button className="btn ghost" onClick={onBack}>Back</button>
          <button className="btn primary" onClick={() => s.updateBookMeta({ trim: PRINT_TRIM })}>Switch to 8.5&quot; square</button>
        </div>
      </div>
    );

  const getQuote = async () => {
    setErr("");
    const problem = validateShipTo(ship);
    if (problem) return setErr(problem);
    setBusy("Getting the price…");
    try {
      setQuote(await postJson<QuoteRes>("/api/orders/quote", { bookId: cloud.bookId, format, quantity: qty, shippingLevel: level, shipTo: ship }));
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(null);
  };

  const pay = async () => {
    setErr("");
    if (!ready) return setErr("Finish the print check first: fix ⛔ items and mark ⚠️ items OK.");
    try {
      setBusy("Getting your book ready…");
      const latest = useStore.getState().books[cloud.bookId];
      const size = await postJson<{ width: number; height: number; pages: number }>("/api/orders/cover-size", { format, pages: latest.pages.length });
      const interior = await buildInteriorPdf(latest, { dpi: 300, watermark: false, padTo: size.pages, onProgress: (n, t) => setBusy(`Preparing print page ${n} of ${t}…`) });
      setBusy("Preparing the cover…");
      const wrap = (size.height - 8.5) / 2;
      const cover = await buildCoverPdf(latest, { widthIn: size.width, heightIn: size.height, spineIn: Math.max(0, size.width - 2 * (8.5 + wrap)) });
      setBusy("Uploading print files…");
      const [interiorKey, coverKey] = await Promise.all([uploadPrintFile(interior), uploadPrintFile(cover)]);
      setBusy("Opening secure checkout…");
      const j = await postJson<{ url: string }>("/api/orders", { bookId: cloud.bookId, format, quantity: qty, shippingLevel: level, shipTo: ship, email, interiorKey, coverKey });
      window.location.href = j.url;
    } catch (e) {
      setErr((e as Error).message);
      setBusy(null);
    }
  };

  return (
    <div className="order-form">
      <div className="format-cards" role="radiogroup" aria-label="Format">
        {(Object.keys(FORMATS) as PrintFormat[]).map((f) => (
          <button key={f} type="button" role="radio" aria-checked={format === f} className={"format-card" + (format === f ? " on" : "")} onClick={() => (setFormat(f), setQuote(null))}>
            <strong>{FORMATS[f].label}</strong>
            <span className="price">{money(unitPriceCents(f, pages))}</span>
            <span className="hint">{FORMATS[f].blurb}</span>
          </button>
        ))}
      </div>
      {printed > pages && <p className="fineprint">This binding needs {printed} pages; {printed - pages} blank page{printed - pages > 1 ? "s" : ""} will be added at the end.</p>}
      <div className="field-row">
        <label className="field">
          <span>Copies</span>
          <input type="number" min={1} max={50} value={qty} onChange={(e) => (setQty(Math.max(1, Math.min(50, Number(e.target.value) || 1))), setQuote(null))} />
        </label>
        <label className="field">
          <span>Shipping</span>
          <select value={level} onChange={(e) => (setLevel(e.target.value as ShippingLevel), setQuote(null))}>
            {(Object.keys(SHIPPING) as ShippingLevel[]).map((l) => <option key={l} value={l}>{SHIPPING[l].label} ({SHIPPING[l].days})</option>)}
          </select>
        </label>
      </div>
      <h4>Ship to</h4>
      <div className="address">
        <input aria-label="Full name" placeholder="Full name" autoComplete="name" value={ship.name} maxLength={35} onChange={(e) => set({ name: e.target.value })} />
        <input aria-label="Street address" placeholder="Street address" autoComplete="address-line1" value={ship.street1} maxLength={30} onChange={(e) => set({ street1: e.target.value })} />
        <input aria-label="Apartment, suite (optional)" placeholder="Apartment, suite (optional)" autoComplete="address-line2" value={ship.street2} maxLength={30} onChange={(e) => set({ street2: e.target.value })} />
        <div className="field-row three">
          <input aria-label="City" placeholder="City" autoComplete="address-level2" value={ship.city} maxLength={30} onChange={(e) => set({ city: e.target.value })} />
          <input aria-label="State" placeholder="State" autoComplete="address-level1" value={ship.state_code} maxLength={3} onChange={(e) => set({ state_code: e.target.value.toUpperCase() })} />
          <input aria-label="ZIP code" placeholder="ZIP" autoComplete="postal-code" value={ship.postcode} maxLength={10} onChange={(e) => set({ postcode: e.target.value })} />
        </div>
        <div className="field-row">
          <select aria-label="Country" value={ship.country_code} onChange={(e) => set({ country_code: e.target.value })}>
            {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
          <input aria-label="Phone for delivery" placeholder="Phone for delivery" autoComplete="tel" value={ship.phone_number} onChange={(e) => set({ phone_number: e.target.value })} />
        </div>
        <input aria-label="Email for order updates" type="email" placeholder="Email for order updates (optional, uses your account email)" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      {quote && (
        <table className="quote">
          <tbody>
            <tr><td>{qty} × {FORMATS[format].label}, {quote.pages} pages</td><td>{money(quote.itemsCents)}</td></tr>
            <tr><td>Shipping ({SHIPPING[level].label}){quote.shippingEstimated ? ", estimate" : ""}</td><td>{money(quote.shippingCents)}</td></tr>
            <tr className="total"><td>Total before tax</td><td>{money(quote.totalCents)}</td></tr>
          </tbody>
        </table>
      )}
      {!ready && <p className="notice">Finish the print check on the previous screen before paying.</p>}
      {busy && <p className="hint" role="status">{busy}</p>}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="form-actions">
        <button className="btn ghost" onClick={onBack} disabled={!!busy}>Back</button>
        {quote ? (
          <button className="btn primary" onClick={pay} disabled={!!busy || !ready}>Pay {money(quote.totalCents)}</button>
        ) : (
          <button className="btn primary" onClick={getQuote} disabled={!!busy}>See total</button>
        )}
      </div>
      <p className="fineprint">Printed and shipped by Lulu. Payment by Stripe; tax is added at checkout where it applies.</p>
    </div>
  );
}
