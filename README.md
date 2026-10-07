# Bookling 📖

Make a children's picture book as easily as a Canva design — pick a scene, drop in posable characters, write your words, then print one copy or publish it.

**Stack:** Next.js 16 · React 19 · Clerk (login) · Stripe (payments) · Konva (canvas editor) · jsPDF (print files)
**Starter art:** 12 backgrounds + 8 stickers generated with Higgsfield (`public/templates`).

---

## What's built

| Area | What works today |
|---|---|
| **Editor** | Drag/resize/rotate anything, snap-to-center guides, undo/redo, layers, duplicate, lock, keyboard shortcuts, phone layout with bottom sheets |
| **Scenes** | 12 painted backgrounds + plain colors, "cover" fit for any trim size |
| **Characters** | Vector rigs (kid, bear, bunny, cat, robot). 12 pose presets + per-joint sliders (lean, head, elbows, knees…), 5 faces, hair styles, skin tones, outfit colors, flip |
| **Text** | 10 kid-friendly OFL fonts, size, color, bold/italic, alignment, outline, speech bubbles, line spacing, double-click to edit on the page |
| **Stickers & uploads** | 8 cut-out stickers, "Surprise me", upload drawings/photos |
| **AI art** | `/api/ai-image` — fal.ai FLUX (cheapest) or OpenAI gpt-image-1, kid-safe prompt wrapper, monthly quota per plan |
| **Read it** | Page-flip preview with swipe + browser read-aloud |
| **Export** | Full-bleed interior PDF (300 dpi on paid, 150 dpi + watermark on free), paperback cover wrap with spine, single page image |
| **Publish** | Links + notes for KDP, Lulu, IngramSpark, B&N Press, Draft2Digital, Blurb, BookBaby, Apple, Kobo, Google Play; AI-disclosure reminder |
| **Print a copy** | `/api/print-order` — Lulu Print API (needs PDF storage, see below) |
| **Accounts** | Clerk sign-in/up with branded pages, protected routes via `proxy.ts`, plan stored in Clerk metadata |
| **Plans** | Free / $4.99 / $9.99 (+ yearly, + one-time add-ons) in `lib/plans.ts`; Stripe Checkout, Billing Portal and webhook |

Books are saved in the browser per user (localStorage). Cloud sync is the next step (see Roadmap).

---

## Run it locally

```bash
npm install
cp .env.example .env.local     # skip if you received .env.local with the project
npm run dev                     # http://localhost:3000
```

### 1. Clerk (login)
This project was initialised with Clerk's **accountless dev keys** — login already works locally with no account.
To make the app yours:
```bash
npx clerk auth login            # claims the dev app into your Clerk account automatically
```
In the Clerk dashboard turn on Google / Apple sign-in and email codes. For production, create a prod instance and set the `pk_live`/`sk_live` keys in Vercel.

### 2. Stripe (payments)
1. Create products: **Storyteller** ($4.99/mo, $39/yr), **Publisher** ($9.99/mo, $79/yr), **AI pack** ($3 one-time), **Keepsake unlock** ($6 one-time).
2. Paste each Price ID into `.env.local` (`STRIPE_PRICE_*`).
3. Add a webhook → `https://YOUR_DOMAIN/api/webhooks/stripe` with `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
4. In **Settings → Payment methods** switch on Apple Pay, Google Pay, Link, PayPal, Cash App, Klarna — one integration, many ways to pay.

### 3. AI illustrations
`AI_IMAGE_PROVIDER=fal` + `FAL_KEY` (cheapest), or `openai` + `OPENAI_API_KEY` (transparent stickers).

### 4. Printed copies (optional)
Get sandbox keys at developers.lulu.com. Lulu needs public URLs for the PDFs, so add storage (Vercel Blob or Cloudflare R2), upload the exported files, then call `/api/print-order`.

---

## Put it on GitHub

```bash
git remote add origin https://github.com/<you>/bookling.git
git push -u origin main
```
`.env.local` and `.clerk/` are git-ignored — keep them that way.

## Deploy
Import the repo in Vercel, add the env vars from `.env.example`, deploy. Point a domain at it and set `NEXT_PUBLIC_APP_URL`.

---

## Project map
```
app/                 pages + API routes (checkout, billing-portal, webhooks/stripe, ai-image, print-order)
components/editor/   Editor shell, PageStage (canvas), CharacterShape (rig), Panels, Inspector
lib/                 book model & poses, store (undo/redo), plans, publishers, fonts, templates, export
proxy.ts             Clerk route protection (Next 16 name for middleware)
public/templates/    Higgsfield starter art
scripts/build-demo.mjs  single-file demo build of the editor
```

## Roadmap
1. Cloud save (Supabase/Postgres) + share links for family "read along"
2. Personalization fields: `{childName}` + photo swap → one template, thousands of unique keepsakes
3. More rigs/outfits, multi-character scenes, consistent AI characters
4. Narrated video export and animated pages
5. EPUB fixed-layout export for Apple/Kobo
