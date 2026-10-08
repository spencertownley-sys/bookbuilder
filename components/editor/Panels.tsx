"use client";
import { useRef, useState } from "react";
import { BACKGROUNDS, STICKERS, assetUrl } from "@/lib/templates";
import { FONTS } from "@/lib/fonts";
import { FREE_RIGS, Rig, newCharacter, newImage, newText, pageDims, PALETTE } from "@/lib/book";
import { useCurrent, useStore } from "@/lib/store";
import type { Plan } from "@/lib/plans";
import { loadImage } from "@/lib/images";

export type PanelId = "backgrounds" | "characters" | "stickers" | "text" | "ai" | "uploads" | "family";

export const PANEL_TABS: { id: PanelId; label: string; icon: string }[] = [
  { id: "backgrounds", label: "Scenes", icon: "🏞️" },
  { id: "characters", label: "Characters", icon: "🧒" },
  { id: "stickers", label: "Stickers", icon: "🎈" },
  { id: "text", label: "Text", icon: "🔤" },
  { id: "ai", label: "AI Art", icon: "✨" },
  { id: "uploads", label: "Uploads", icon: "📷" },
  { id: "family", label: "Family", icon: "💌" },
];

export interface Services {
  generateImage: (prompt: string, kind: "scene" | "sticker") => Promise<{ url: string } | { error: string }>;
  uploadImage?: (file: File) => Promise<string>; // stores the file and returns its URL (real app)
}

const RIG_INFO: Record<Rig, { label: string; emoji: string }> = {
  kid: { label: "Kid", emoji: "🧒" },
  bear: { label: "Bear", emoji: "🐻" },
  bunny: { label: "Bunny", emoji: "🐰" },
  cat: { label: "Cat", emoji: "🐱" },
  robot: { label: "Robot", emoji: "🤖" },
};

export function PanelBody({ id, plan, services, onUpsell }: { id: PanelId; plan: Plan; services: Services; onUpsell: (why: string) => void }) {
  const { book, page } = useCurrent();
  const s = useStore();
  if (!book || !page) return null;
  const d = pageDims(book.trim);

  if (id === "backgrounds")
    return (
      <div className="panel-pad">
        <h3>Scenes</h3>
        <p className="hint">Tap a scene to set this page&apos;s background.</p>
        <div className="grid2">
          {BACKGROUNDS.map((b) => (
            <button key={b.id} className={"thumb" + (page.background === b.src ? " on" : "")} onClick={() => s.setBackground(b.src)}>
              <img src={assetUrl(b.src)} alt={b.name} loading="lazy" />
              <span>{b.name}</span>
            </button>
          ))}
        </div>
        <h4>Plain color</h4>
        <div className="swatches">
          {["#FFFDF7", "#FFF1E6", "#E8F6EF", "#E3F2FD", "#F3E8FF", "#FFF9C4", "#2A363B"].map((c) => (
            <button key={c} className="swatch" style={{ background: c }} onClick={() => s.setBackground(undefined, c)} aria-label={c} />
          ))}
        </div>
      </div>
    );

  if (id === "characters")
    return (
      <div className="panel-pad">
        <h3>Characters</h3>
        <p className="hint">Add a character, then pick a pose or bend each arm and leg in the panel.</p>
        <div className="grid2">
          {(Object.keys(RIG_INFO) as Rig[]).map((r) => {
            const locked = plan.limits.characters === "basic" && !FREE_RIGS.includes(r);
            return (
              <button
                key={r}
                className="rig-card"
                onClick={() => {
                  if (locked) return onUpsell("Unlock every character with Storyteller");
                  // spread characters across the page so new ones don't hide old ones
                  const n = page.elements.filter((e) => e.type === "character").length;
                  const slots = [0.5, 0.28, 0.72, 0.4, 0.6];
                  s.addElement(newCharacter(r, d.width * slots[n % slots.length], d.height * 0.66));
                }}
              >
                <span className="rig-emoji">{RIG_INFO[r].emoji}</span>
                {RIG_INFO[r].label}
                {locked && <span className="lock">🔒</span>}
              </button>
            );
          })}
        </div>
      </div>
    );

  if (id === "stickers")
    return (
      <div className="panel-pad">
        <h3>Stickers</h3>
        <div className="grid3">
          {STICKERS.map((st) => (
            <button
              key={st.id}
              className="thumb sticker"
              onClick={async () => {
                const img = await loadImage(st.src);
                const el = newImage(st.src, d.width, d.height, { w: img.width, h: img.height });
                // drop near the top, nudged so repeated taps don't stack exactly
                el.x = Math.min(d.width - el.width - d.safe, Math.max(d.safe, el.x + (Math.random() - 0.5) * d.width * 0.4));
                el.y = d.safe + Math.random() * d.height * 0.15;
                s.addElement(el);
              }}
            >
              <img src={assetUrl(st.src)} alt={st.name} loading="lazy" />
            </button>
          ))}
        </div>
        <button
          className="btn ghost wide"
          onClick={async () => {
            const st = STICKERS[Math.floor(Math.random() * STICKERS.length)];
            const img = await loadImage(st.src);
            const el = newImage(st.src, d.width, d.height, { w: img.width, h: img.height });
            el.x = Math.random() * (d.width - el.width);
            el.y = Math.random() * (d.height * 0.5);
            el.rotation = Math.random() * 30 - 15;
            s.addElement(el);
          }}
        >
          🎲 Surprise me
        </button>
      </div>
    );

  if (id === "text")
    return (
      <div className="panel-pad">
        <h3>Text</h3>
        <button className="text-preset" style={{ fontFamily: "Chewy", fontSize: 30 }} onClick={() => s.addElement(newText("Once upon a time", { fontFamily: "Chewy", fontSize: 84, fill: "#FFFFFF", outline: "#6C5B7B", y: d.safe }, d.width))}>
          Add a title
        </button>
        <button className="text-preset" style={{ fontFamily: "Fredoka", fontSize: 20, fontWeight: 600 }} onClick={() => s.addElement(newText("A new chapter", { fontFamily: "Fredoka", fontSize: 56, bold: true, y: d.safe }, d.width))}>
          Add a heading
        </button>
        <button className="text-preset" style={{ fontFamily: "Andika", fontSize: 16 }} onClick={() => s.addElement(newText("Write your story here. Tap twice to edit.", { fontFamily: "Andika", fontSize: 40, y: d.height - d.safe - 140, width: d.width * 0.8 }, d.width))}>
          Add story text
        </button>
        <button className="text-preset" style={{ fontFamily: "Patrick Hand", fontSize: 18 }} onClick={() => s.addElement(newText("Hello!", { fontFamily: "Patrick Hand", fontSize: 44, bubble: true, width: 260, x: d.width * 0.55, y: d.height * 0.25 }, d.width))}>
          💬 Speech bubble
        </button>
        <h4>Fonts</h4>
        <div className="font-list">
          {FONTS.map((f) => (
            <button key={f.family} style={{ fontFamily: f.family }} onClick={() => s.addElement(newText(f.family.split(" ")[0] + " words", { fontFamily: f.family, y: d.height / 2 - 40 }, d.width))}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
    );

  if (id === "ai") return <AiPanel plan={plan} services={services} onUpsell={onUpsell} />;

  return <UploadPanel services={services} />;
}

function AiPanel({ plan, services, onUpsell }: { plan: Plan; services: Services; onUpsell: (why: string) => void }) {
  const { book } = useCurrent();
  const s = useStore();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("soft watercolor");
  const [kind, setKind] = useState<"scene" | "sticker">("scene");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!book) return null;
  const d = pageDims(book.trim);
  const go = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    setErr("");
    const r = await services.generateImage(`${prompt}, ${style} children's picture book style`, kind);
    setBusy(false);
    if ("error" in r) {
      setErr(r.error);
      if (/limit|upgrade/i.test(r.error)) onUpsell("Get more AI illustrations every month");
      return;
    }
    s.markAI();
    if (kind === "scene") s.setBackground(r.url);
    else {
      const img = await loadImage(r.url);
      s.addElement(newImage(r.url, d.width, d.height, { w: img.width, h: img.height }, true));
    }
  };
  return (
    <div className="panel-pad">
      <h3>✨ AI Art</h3>
      <p className="hint">{plan.limits.aiImagesPerMonth} illustrations / month on {plan.name}.</p>
      <div className="seg">
        <button className={kind === "scene" ? "on" : ""} onClick={() => setKind("scene")}>Scene</button>
        <button className={kind === "sticker" ? "on" : ""} onClick={() => setKind("sticker")}>Sticker</button>
      </div>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder={kind === "scene" ? "A treehouse in a giant oak at sunset" : "A friendly purple dragon"} />
      <div className="chips">
        {["soft watercolor", "crayon", "bold cartoon", "cut-paper collage", "cozy gouache"].map((st) => (
          <button key={st} className={style === st ? "on" : ""} onClick={() => setStyle(st)}>{st}</button>
        ))}
      </div>
      <button className="btn primary wide" disabled={busy || !prompt.trim()} onClick={go}>
        {busy ? "Painting…" : "Create"}
      </button>
      {err && <p className="err">{err}</p>}
      <p className="fineprint">Books with AI art must be disclosed when publishing on Amazon KDP and Apple Books — we&apos;ll remind you at export.</p>
    </div>
  );
}

function UploadPanel({ services }: { services: Services }) {
  const { book } = useCurrent();
  const s = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!book) return null;
  const d = pageDims(book.trim);
  const place = async (src: string) => {
    const img = await loadImage(src);
    s.addElement(newImage(src, d.width, d.height, { w: img.width, h: img.height }));
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    setErr("");
    if (services.uploadImage) {
      setBusy(true);
      try {
        await place(await services.uploadImage(f));
      } catch (e) {
        setErr((e as Error).message);
      }
      setBusy(false);
      if (input.current) input.current.value = "";
      return;
    }
    const r = new FileReader(); // demo: keep the image inside the page
    r.onload = () => place(r.result as string);
    r.readAsDataURL(f);
  };
  return (
    <div className="panel-pad">
      <h3>Uploads</h3>
      <p className="hint">Add a child&apos;s drawing, a family photo, or your own art.</p>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <button className="btn primary wide" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Uploading…" : "Upload an image"}</button>
      {err && <p className="err" role="alert">{err}</p>}
      <h4>Page color</h4>
      <div className="swatches">
        {PALETTE.map((c) => (
          <button key={c} className="swatch" style={{ background: c }} onClick={() => s.setBackground(undefined, c)} aria-label={c} />
        ))}
      </div>
    </div>
  );
}
