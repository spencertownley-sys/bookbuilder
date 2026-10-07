"use client";
import { useState } from "react";
import { useCurrent, useStore } from "@/lib/store";
import { FONTS } from "@/lib/fonts";
import {
  CharacterEl, El, Expression, HairStyle, Joint, JOINT_LABELS, PALETTE, POSES, SKIN_TONES, TextEl,
} from "@/lib/book";

function Slider({ label, value, min, max, step = 1, onStart, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onStart: () => void; onChange: (v: number) => void;
}) {
  return (
    <label className="slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onPointerDown={onStart} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Swatches({ colors, value, onPick }: { colors: string[]; value?: string; onPick: (c: string) => void }) {
  return (
    <div className="swatches">
      {colors.map((c) => (
        <button key={c} className={"swatch" + (value?.toLowerCase() === c.toLowerCase() ? " on" : "")} style={{ background: c }} onClick={() => onPick(c)} aria-label={c} />
      ))}
      <input type="color" className="swatch picker" value={value ?? "#000000"} onChange={(e) => onPick(e.target.value)} aria-label="Custom color" />
    </div>
  );
}

export default function Inspector({ onClose }: { onClose?: () => void }) {
  const { page } = useCurrent();
  const s = useStore();
  const el = page?.elements.find((e) => e.id === s.selectedId);
  if (!el) return null;
  const upd = (patch: Partial<El>, commit = true) => s.updateElement(el.id, patch, commit);
  const checkpoint = () => s.updateElement(el.id, {}, true);

  return (
    <div className="inspector">
      <div className="insp-head">
        <strong>{el.type === "text" ? "Text" : el.type === "character" ? (el as CharacterEl).name : "Image"}</strong>
        {onClose && <button className="icon" onClick={onClose} aria-label="Close">✕</button>}
      </div>
      <div className="row-actions">
        <button onClick={() => s.duplicateElement(el.id)} title="Duplicate">⧉</button>
        <button onClick={() => s.reorder(el.id, "front")} title="Bring to front">⬆︎</button>
        <button onClick={() => s.reorder(el.id, "back")} title="Send to back">⬇︎</button>
        {el.type !== "text" && <button onClick={() => upd({ flipX: !(el as CharacterEl).flipX } as Partial<El>)} title="Flip">⇋</button>}
        <button onClick={() => upd({ locked: !el.locked })} title="Lock">{el.locked ? "🔒" : "🔓"}</button>
        <button className="danger" onClick={() => s.deleteElement(el.id)} title="Delete">🗑</button>
      </div>
      {el.type === "text" && <TextInspector el={el} upd={upd} checkpoint={checkpoint} />}
      {el.type === "character" && <CharacterInspector el={el} upd={upd} checkpoint={checkpoint} />}
      {el.type !== "character" && (
        <Slider label="Rotate" value={Math.round(el.rotation)} min={-180} max={180} onStart={checkpoint} onChange={(v) => upd({ rotation: v }, false)} />
      )}
    </div>
  );
}

function TextInspector({ el, upd, checkpoint }: { el: TextEl; upd: (p: Partial<El>, c?: boolean) => void; checkpoint: () => void }) {
  return (
    <div className="insp-body">
      <textarea id="text-editor" value={el.text} rows={3} onFocus={checkpoint} onChange={(e) => upd({ text: e.target.value }, false)} />
      <select value={el.fontFamily} onChange={(e) => upd({ fontFamily: e.target.value })} style={{ fontFamily: el.fontFamily }}>
        {FONTS.map((f) => (
          <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.label}</option>
        ))}
      </select>
      <div className="size-row">
        <button onClick={() => upd({ fontSize: Math.max(8, el.fontSize - 4) })}>A−</button>
        <input type="number" value={el.fontSize} min={8} max={400} onChange={(e) => upd({ fontSize: Number(e.target.value) || 8 })} />
        <button onClick={() => upd({ fontSize: Math.min(400, el.fontSize + 4) })}>A+</button>
      </div>
      <div className="seg">
        <button className={el.bold ? "on" : ""} onClick={() => upd({ bold: !el.bold })}><b>B</b></button>
        <button className={el.italic ? "on" : ""} onClick={() => upd({ italic: !el.italic })}><i>I</i></button>
        {(["left", "center", "right"] as const).map((a) => (
          <button key={a} className={el.align === a ? "on" : ""} onClick={() => upd({ align: a })}>{a === "left" ? "⇤" : a === "center" ? "≡" : "⇥"}</button>
        ))}
      </div>
      <h4>Color</h4>
      <Swatches colors={PALETTE} value={el.fill} onPick={(c) => upd({ fill: c })} />
      <div className="seg">
        <button className={el.outline ? "on" : ""} onClick={() => upd({ outline: el.outline ? undefined : "#FFFFFF" })}>Outline</button>
        <button className={el.bubble ? "on" : ""} onClick={() => upd({ bubble: !el.bubble })}>💬 Bubble</button>
      </div>
      {el.outline && <Swatches colors={PALETTE} value={el.outline} onPick={(c) => upd({ outline: c })} />}
      <Slider label="Line spacing" value={el.lineHeight} min={0.8} max={2.2} step={0.05} onStart={checkpoint} onChange={(v) => upd({ lineHeight: v }, false)} />
    </div>
  );
}

function CharacterInspector({ el, upd, checkpoint }: { el: CharacterEl; upd: (p: Partial<El>, c?: boolean) => void; checkpoint: () => void }) {
  const [fine, setFine] = useState(false);
  const setColor = (k: keyof CharacterEl["colors"], c: string) => upd({ colors: { ...el.colors, [k]: c } } as Partial<El>);
  return (
    <div className="insp-body">
      <input value={el.name} onChange={(e) => upd({ name: e.target.value } as Partial<El>, false)} onFocus={checkpoint} placeholder="Character name" />
      <h4>Pose</h4>
      <div className="pose-grid">
        {Object.entries(POSES).map(([k, p]) => (
          <button key={k} onClick={() => upd({ pose: { ...p.pose } } as Partial<El>)}>
            <span>{p.emoji}</span>
            {p.label}
          </button>
        ))}
      </div>
      <button className="btn ghost wide" onClick={() => setFine(!fine)}>{fine ? "Hide" : "🦴 Bend arms & legs"}</button>
      {fine &&
        (Object.keys(JOINT_LABELS) as Joint[]).map((j) => (
          <Slider
            key={j}
            label={JOINT_LABELS[j]}
            value={el.pose[j]}
            min={j === "torso" || j === "neck" ? -40 : -180}
            max={j === "torso" || j === "neck" ? 40 : 180}
            onStart={checkpoint}
            onChange={(v) => upd({ pose: { ...el.pose, [j]: v } } as Partial<El>, false)}
          />
        ))}
      <Slider label="Tilt whole body" value={Math.round(el.rotation)} min={-180} max={180} onStart={checkpoint} onChange={(v) => upd({ rotation: v }, false)} />
      <h4>Face</h4>
      <div className="chips">
        {(["happy", "laughing", "surprised", "sleepy", "sad"] as Expression[]).map((x) => (
          <button key={x} className={el.expression === x ? "on" : ""} onClick={() => upd({ expression: x } as Partial<El>)}>{x}</button>
        ))}
      </div>
      {el.rig === "kid" && (
        <>
          <h4>Hair</h4>
          <div className="chips">
            {(["short", "long", "curly", "buns", "none"] as HairStyle[]).map((x) => (
              <button key={x} className={el.hair === x ? "on" : ""} onClick={() => upd({ hair: x } as Partial<El>)}>{x}</button>
            ))}
          </div>
          <Swatches colors={["#2B1B0E", "#5B3A1E", "#A0522D", "#E3B76B", "#F4E1A1", "#C0392B", "#7C4DFF"]} value={el.colors.hair} onPick={(c) => setColor("hair", c)} />
          <h4>Skin</h4>
          <Swatches colors={SKIN_TONES} value={el.colors.skin} onPick={(c) => setColor("skin", c)} />
        </>
      )}
      {el.rig !== "kid" && (
        <>
          <h4>{el.rig === "robot" ? "Metal" : "Fur"}</h4>
          <Swatches colors={["#A8754B", "#F4F1EC", "#F2A65A", "#7D7D7D", "#2B2B2B", "#B8C4CC", "#C9A0DC"]} value={el.colors.skin} onPick={(c) => { setColor("skin", c); }} />
        </>
      )}
      <h4>Shirt</h4>
      <Swatches colors={PALETTE} value={el.colors.shirt} onPick={(c) => setColor("shirt", c)} />
      <h4>Pants</h4>
      <Swatches colors={PALETTE} value={el.colors.pants} onPick={(c) => setColor("pants", c)} />
      <h4>Shoes</h4>
      <Swatches colors={PALETTE} value={el.colors.shoes} onPick={(c) => setColor("shoes", c)} />
    </div>
  );
}
