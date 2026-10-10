import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { STARTERS } from "@/lib/starters";
import { FORMATS, money } from "@/lib/printing";
import { ADD_ONS } from "@/lib/plans";

const STEPS = [
  { i: "📖", t: "Pick a story", d: "Six ready-made 24-page stories, from birthdays to bedtime. Or start from a blank page." },
  { i: "⭐", t: "Star your child", d: "Their name, pronouns, skin tone, hair and favorite color, plus a photo for the dedication. Every page updates at once." },
  { i: "📦", t: "Print it or share it", d: "Order a hardcover to your door (or Grandma's), or text the family a private flipbook link." },
];

const FEATURES = [
  { i: "💌", t: "A link for the family", d: "A private flipbook anyone can open on their phone. They can leave hearts and notes on each page. No sign-in needed." },
  { i: "🎙️", t: "Grandma reads it aloud", d: "Invite relatives to record narration for every page from their phone. The book plays it back at bedtime." },
  { i: "🎨", t: "Change anything", d: "As easy as Canva and as fun as a sticker book: posable characters, hand-painted scenes, kid-friendly fonts and AI illustrations." },
  { i: "✅", t: "No printing surprises", d: "Before you pay, we check for blurry pictures, words too close to the edge and missing names." },
  { i: "🔒", t: "Private by design", d: "Your child's name and photo are never public, never used to train AI, and deleted whenever you say." },
  { i: "📚", t: "Publishing, too", d: "On paid plans, download print-ready files for Amazon KDP, IngramSpark and Lulu." },
];

const keepsake = ADD_ONS.find((a) => a.id === "keepsake")!;

export default async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const deleted = (await searchParams).deleted;
  return (
    <>
      <SiteNav />
      {deleted && (
        <p className="notice center-notice" role="status">Your account and all of your books have been deleted. Thanks for making stories with us.</p>
      )}
      <section className="hero">
        <div>
          <p className="eyebrow">Personalized picture books</p>
          <h1>
            A real book starring <span className="hl">your child</span>.
          </h1>
          <p className="lead">
            Pick a story, add their name and look, and we&apos;ll print a hardcover and ship it to your door. Most families finish in under 30
            minutes.
          </p>
          <div className="ctas">
            <Link href="/sign-up" className="btn primary big">Make their book, free</Link>
            <Link href="#stories" className="btn ghost big">See the stories</Link>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>
            Free to make and share. Printed hardcovers {money(FORMATS.hardcover.retailCents)}, paperbacks {money(FORMATS.paperback.retailCents)}, plus shipping.
          </p>
        </div>
        <div className="hero-art" aria-hidden>
          <img className="a" src="/templates/backgrounds/forest.jpg" alt="" />
          <img className="b" src="/templates/backgrounds/space.jpg" alt="" />
          <img className="st" src="/templates/elements/balloons.png" alt="" style={{ width: "22%", right: "6%", top: "0%" }} />
          <img className="st" src="/templates/elements/sun.png" alt="" style={{ width: "20%", left: "-2%", bottom: "6%", animationDelay: "1s" }} />
        </div>
      </section>

      <section className="section">
        <h2>Three steps to a book they&apos;ll keep</h2>
        <ol className="how">
          {STEPS.map((s, n) => (
            <li key={s.t} className="feature">
              <span className="how-num">{n + 1}</span>
              <div className="fi">{s.i}</div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section" id="stories">
        <h2>Stories ready for your star</h2>
        <div className="starters">
          {STARTERS.map((s) => (
            <Link key={s.id} href="/sign-up" className="starter-card">
              <span className="starter-art" style={{ backgroundImage: `url(/templates/backgrounds/${s.cover}.jpg)` }}>
                <span className="starter-emoji" aria-hidden>{s.emoji}</span>
              </span>
              <strong>{s.title.replace("{Name}'s", "Your child's").replace("{Name}", "Your child")}</strong>
              <span className="hint">{s.blurb}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Made for the whole family</h2>
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

      <section className="section">
        <h2>Simple prices</h2>
        <div className="price-cards">
          <div className="feature">
            <h3>Make &amp; share</h3>
            <p className="big-price">Free</p>
            <p>Two books, every story starter, family share links and voice recordings.</p>
          </div>
          <div className="feature hl">
            <h3>Hardcover</h3>
            <p className="big-price">{money(FORMATS.hardcover.retailCents)}</p>
            <p>8.5&quot; square, glossy and sturdy. Printed for you and shipped anywhere we deliver. Shipping at cost.</p>
          </div>
          <div className="feature">
            <h3>Paperback</h3>
            <p className="big-price">{money(FORMATS.paperback.retailCents)}</p>
            <p>The same book with a soft glossy cover. Lighter and cheaper to send.</p>
          </div>
          <div className="feature">
            <h3>Keepsake unlock</h3>
            <p className="big-price">${keepsake.price}</p>
            <p>One book, forever: print-ready 300 dpi files and no watermark. Included free with any printed order.</p>
          </div>
        </div>
        <p className="hint" style={{ textAlign: "center", marginTop: 16 }}>
          Writing books to sell? <Link href="/pricing">See the Storyteller and Publisher plans</Link>.
        </p>
      </section>
      <SiteFooter />
    </>
  );
}
