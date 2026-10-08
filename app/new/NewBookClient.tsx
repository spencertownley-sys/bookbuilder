"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { STARTERS } from "@/lib/starters";
import type { Hero } from "@/lib/book";
import { uploadImage } from "@/lib/api";

const HeroForm = dynamic(() => import("@/components/HeroForm"), { ssr: false });

export default function NewBookClient() {
  const [starter, setStarter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();
  const st = STARTERS.find((s) => s.id === starter);

  const create = async (hero: Hero) => {
    setBusy(true);
    setErr("");
    const r = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(starter === "blank" ? { hero, title: `${hero.name}'s Story` } : { starterId: starter, hero }),
    });
    const j = await r.json();
    if (!r.ok) {
      setBusy(false);
      return setErr(j.error ?? "Couldn't create the book.");
    }
    router.push(`/editor/${j.id}`);
  };

  if (!starter)
    return (
      <>
        <div className="step-head">
          <span className="step-num">Step 1 of 2</span>
          <h1>Pick a story to start from</h1>
          <p className="hint">Every starter is a finished 24-page book. You can change any word or picture after.</p>
        </div>
        <div className="starters">
          {STARTERS.map((s) => (
            <button key={s.id} className="starter-card" onClick={() => setStarter(s.id)}>
              <span className="starter-art" style={{ backgroundImage: `url(/templates/backgrounds/${s.cover}.jpg)` }}>
                <span className="starter-emoji" aria-hidden>{s.emoji}</span>
              </span>
              <strong>{s.title.replace("{Name}'s", "Your child's").replace("{Name}", "Your child")}</strong>
              <span className="hint">{s.blurb}</span>
            </button>
          ))}
          <button className="starter-card blank" onClick={() => setStarter("blank")}>
            <span className="starter-art blank-art"><span className="starter-emoji" aria-hidden>✏️</span></span>
            <strong>Blank book</strong>
            <span className="hint">Start from an empty page and make it all yourself.</span>
          </button>
        </div>
      </>
    );

  return (
    <>
      <div className="step-head">
        <button className="link-btn" onClick={() => setStarter(null)}>← Choose a different story</button>
        <span className="step-num">Step 2 of 2</span>
        <h1>Who is the star of {st ? "this story" : "your book"}?</h1>
        <p className="hint">Their name, pronouns and look appear on every page. You can change this later.</p>
      </div>
      <HeroForm submitLabel={starter === "blank" ? "Create my book" : "Make my book"} busy={busy} onSubmit={create} uploadPhoto={uploadImage} />
      {err && <p className="err" role="alert" style={{ textAlign: "center" }}>{err} {err.includes("plan") && <a href="/pricing">See plans</a>}</p>}
    </>
  );
}
