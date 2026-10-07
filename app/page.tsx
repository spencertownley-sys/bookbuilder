import Link from "next/link";
import SiteNav from "@/components/SiteNav";

const FEATURES = [
  { i: "🏞️", t: "Pick a scene", d: "Start from hand-painted backgrounds — meadows, bedrooms, outer space — or paint a new one with AI." },
  { i: "🧒", t: "Pose your characters", d: "Drop in kids, bears, bunnies and robots, then tap Wave, Run or Jump, or bend each arm and leg yourself." },
  { i: "🔤", t: "Words your way", d: "Ten kid-friendly fonts, any size or color, speech bubbles, outlines. Drag text anywhere on the page." },
  { i: "🔊", t: "Read it together", d: "Flip through your book with page-turn animation and let it read your story aloud." },
  { i: "📦", t: "Hold it in your hands", d: "Order a single printed copy, or export print-ready files for Amazon KDP, IngramSpark, Lulu and more." },
  { i: "🎁", t: "One of a kind — or for everyone", d: "Make a keepsake starring one child, or a book you publish and sell to thousands." },
];

export default function Home() {
  return (
    <>
      <SiteNav />
      <section className="hero">
        <div>
          <h1>
            Make a <span className="hl">real picture book</span> in an afternoon.
          </h1>
          <p className="lead">
            Bookling is as easy as Canva and as fun as a sticker book. Drag in scenes, pose characters, write your story — then
            print one copy for bedtime or publish it on Amazon.
          </p>
          <div className="ctas">
            <Link href="/sign-up" className="btn primary big">Start your book — free</Link>
            <Link href="/pricing" className="btn ghost big">See plans</Link>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>No credit card. Your first two books are free forever.</p>
        </div>
        <div className="hero-art" aria-hidden>
          <img className="a" src="/templates/backgrounds/forest.jpg" alt="" />
          <img className="b" src="/templates/backgrounds/space.jpg" alt="" />
          <img className="st" src="/templates/elements/balloons.png" alt="" style={{ width: "22%", right: "6%", top: "0%" }} />
          <img className="st" src="/templates/elements/sun.png" alt="" style={{ width: "20%", left: "-2%", bottom: "6%", animationDelay: "1s" }} />
        </div>
      </section>
      <section className="section">
        <h2>Everything a little author needs</h2>
        <div className="features">
          {FEATURES.map((f) => (
            <div key={f.t} className="feature">
              <div className="fi">{f.i}</div>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="footer">© {new Date().getFullYear()} Bookling · Made for storytellers of every size</footer>
    </>
  );
}
