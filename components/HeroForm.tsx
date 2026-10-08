"use client";
import { useRef, useState } from "react";
import { Stage, Layer, Group } from "react-konva";
import { CharacterBody } from "./editor/CharacterShape";
import { DEFAULT_HERO, Hero, HairStyle, Pronoun, POSES, SKIN_TONES, applyHero, newCharacter } from "@/lib/book";

const HAIR_COLORS = ["#2B1B0E", "#5B3A1E", "#A0522D", "#E3B76B", "#F4E1A1", "#C0392B", "#9E9E9E"];
const FAVORITES = ["#E84A5F", "#FF847C", "#F9D56E", "#99B898", "#3EC1D3", "#7C4DFF", "#6C5B7B", "#2A363B"];

function Preview({ hero }: { hero: Hero }) {
  const c = newCharacter("kid", 0, 0);
  c.isHero = true;
  c.pose = { ...POSES.wave.pose };
  const el = applyHero(c, hero);
  return (
    <Stage width={170} height={220} listening={false}>
      <Layer>
        <Group x={85} y={134} scale={{ x: 0.52, y: 0.52 }}>
          <CharacterBody el={el} />
        </Group>
      </Layer>
    </Stage>
  );
}

function Swatches({ colors, value, onPick, label }: { colors: string[]; value: string; onPick: (c: string) => void; label: string }) {
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      {colors.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={value === c} className={"swatch" + (value === c ? " on" : "")} style={{ background: c }} onClick={() => onPick(c)} aria-label={c} />
      ))}
    </div>
  );
}

export interface HeroFormProps {
  initial?: Hero;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (hero: Hero) => void;
  uploadPhoto?: (file: File) => Promise<string>;
  onCancel?: () => void;
}

/** "Star your child": name, pronouns and look. Used when starting a book and from the editor. */
export default function HeroForm({ initial, submitLabel, busy, onSubmit, uploadPhoto, onCancel }: HeroFormProps) {
  const [h, setH] = useState<Hero>({ ...DEFAULT_HERO, ...initial });
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const set = (p: Partial<Hero>) => setH((x) => ({ ...x, ...p }));

  return (
    <form
      className="hero-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!h.name.trim()) return setErr("Add the hero's name.");
        onSubmit({ ...h, name: h.name.trim() });
      }}
    >
      <div className="hero-preview">
        <Preview hero={h} />
        <strong>{h.name.trim() || "Your hero"}</strong>
      </div>
      <div className="hero-fields">
        <label className="field">
          <span>Hero&apos;s name</span>
          <input id="hero-name" value={h.name} maxLength={40} autoFocus placeholder="e.g. Maya" onChange={(e) => (set({ name: e.target.value }), setErr(""))} />
        </label>
        <div className="field">
          <span>Call them</span>
          <div className="seg" role="radiogroup" aria-label="Pronouns">
            {(["she", "he", "they"] as Pronoun[]).map((p) => (
              <button key={p} type="button" className={h.pronoun === p ? "on" : ""} onClick={() => set({ pronoun: p })}>
                {p === "she" ? "she / her" : p === "he" ? "he / him" : "they / them"}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Skin</span>
          <Swatches label="Skin tone" colors={SKIN_TONES} value={h.skin} onPick={(c) => set({ skin: c })} />
        </div>
        <div className="field">
          <span>Hair</span>
          <div className="chips">
            {(["short", "long", "curly", "buns", "none"] as HairStyle[]).map((x) => (
              <button key={x} type="button" className={h.hair === x ? "on" : ""} onClick={() => set({ hair: x })}>{x}</button>
            ))}
          </div>
          <Swatches label="Hair color" colors={HAIR_COLORS} value={h.hairColor} onPick={(c) => set({ hairColor: c })} />
        </div>
        <div className="field">
          <span>Favorite color</span>
          <Swatches label="Favorite color" colors={FAVORITES} value={h.favoriteColor} onPick={(c) => set({ favoriteColor: c })} />
        </div>
        {uploadPhoto && (
          <div className="field">
            <span>Photo for the dedication page (optional)</span>
            <div className="photo-row">
              {h.photo && <img src={h.photo} alt="" className="photo-thumb" />}
              <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setUploading(true);
                try {
                  set({ photo: await uploadPhoto(f) });
                } catch (x) {
                  setErr((x as Error).message);
                }
                setUploading(false);
              }} />
              <button type="button" className="btn ghost" onClick={() => file.current?.click()} disabled={uploading}>
                {uploading ? "Uploading…" : h.photo ? "Change photo" : "Add a photo"}
              </button>
              {h.photo && <button type="button" className="btn ghost" onClick={() => set({ photo: undefined })}>Remove</button>}
            </div>
            <p className="fineprint">Photos stay private to you and the people you share the book with.</p>
          </div>
        )}
        {err && <p className="err" role="alert">{err}</p>}
        <div className="form-actions">
          {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}
          <button type="submit" className="btn primary" disabled={busy || uploading}>{busy ? "Making your book…" : submitLabel}</button>
        </div>
      </div>
    </form>
  );
}
