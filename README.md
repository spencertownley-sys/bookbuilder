# Book Builder 📖

Make a personalized children's picture book in an afternoon: pick a story, star your child, tweak any page, share it with family, and order a printed hardcover.

**Stack:** Next.js 16 · React 19 · Clerk (login) · Postgres (Supabase or any) · Supabase Storage · Stripe · Lulu Print API · Konva (editor) · jsPDF (print files)

Working name: "Book Builder". The brand lives in `components/SiteNav.tsx`, `app/layout.tsx` and a few page titles.

---

## What's in the launch release

| Feature | Where |
|---|---|
| **Cloud save**: books live in Postgres, autosave ~1 s after each change, "Saved" pill, two-device conflict warning, one-time import of books from the old browser-only version | `lib/sync.ts`, `app/api/books/*` |
| **Star your child**: name, pronouns, skin, hair, favorite color, dedication photo. Text uses `{name}`, `{they}`, `{them}`, `{their}`… (capitalize for sentence starts). Hero characters take the hero's look on every page; one undoable change | `lib/book.ts` (`fillTokens`, `applyHero`), `components/HeroForm.tsx` |
| **6 story starters**: Birthday, First Day of School, New Baby Sibling, Bedtime Adventure, Grandparents' Love, Holiday Magic. 24 pages each (cover, dedication, 22 story pages) | `lib/starters.ts` (add more as data) |
| **Family share link**: public flipbook at `/read/<token>`, hearts + notes, revocable, no sign-in, not indexed | `app/read`, `app/api/share/*` |
| **Voice recording**: per-page narration up to 60 s (author or via a "record" invite link at `/record/<token>`); plays in the reader | `components/Recorder.tsx`, `lib/recordings.ts` |
| **Print guardrails**: empty pages, text outside the safe area, low-res images, unfilled `{name}`, page count, AI-disclosure reminder. ⛔ blocks, ⚠️ must be accepted | `lib/checks.ts` |
| **Keepsake unlock**: $6 one-time, per book: print-ready 300 dpi, no watermark | `app/api/checkout` |
| **Printed copies**: hardcover/paperback, quote, Stripe checkout, files rendered in the browser and uploaded straight to storage, job sent to Lulu after payment, order page with status + tracking from Lulu's webhook | `app/api/orders/*`, `lib/lulu.ts`, `lib/fulfill.ts`, `app/orders` |

Plus everything from the prototype: Canva-style editor, posable characters, text tools, Higgsfield starter art, plans, KDP files and publisher links.

---

## Run it locally

```bash
npm install
cp .env.example .env.local   # then add your Clerk keys, or run `npx clerk init` for instant dev keys
npm run db                   # terminal 1: local Postgres on port 54329 (data in .data/)
npm run db:migrate           # once: creates the tables
npm run dev                  # terminal 2: http://localhost:3000
```

With `DEV_FAKE_PAYMENTS=1` and no Stripe key, the Keepsake unlock and print orders succeed instantly, and the Orders page has buttons that simulate the printer's status updates. This only happens in development.

---

## Going live

### 1. Database + storage (Supabase)
Your Supabase free plan already has 2 active projects, so pause one or upgrade before creating `bookbuilder`. Then:
1. **Database:** Project → Connect → copy the **Transaction pooler** URL into `DATABASE_URL`, then run `npm run db:migrate`. Any Postgres works (Neon, Vercel Postgres).
2. **Storage:** Storage → New bucket `media`, **private**, file size limit 100 MB. Copy the project URL and **service role** key into `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. The service key stays on the server only.
3. Row-level security is on for every table with no public policies; all access goes through the app's server.

### 2. Clerk
`npx clerk auth login` claims the dev instance. For production create a prod instance on your domain and set the live keys.

### 3. Stripe
1. Products: Storyteller ($4.99/mo, $39/yr), Publisher ($9.99/mo, $79/yr), AI pack ($3), Keepsake unlock ($6). Paste the Price IDs into `STRIPE_PRICE_*`. Printed copies use dynamic prices, so they need no product.
2. Webhook → `https://YOUR_DOMAIN/api/webhooks/stripe` with `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Turn on Stripe Tax and set `STRIPE_AUTOMATIC_TAX=true` (sales tax on printed books).
4. Remove `DEV_FAKE_PAYMENTS` in production (it's ignored there anyway).

### 4. Lulu (printing)
1. Sandbox first: developers.sandbox.lulu.com → API keys into `LULU_CLIENT_KEY/SECRET`, `LULU_API_BASE=https://api.sandbox.lulu.com`.
2. Register the status webhook once:
   `POST /webhooks/ {"topics":["PRINT_JOB_STATUS_CHANGED"],"url":"https://YOUR_DOMAIN/api/webhooks/lulu"}`
3. Lulu fetches print files from `NEXT_PUBLIC_APP_URL/api/media/...`, so the app must be on a public URL (not localhost) for real orders.
4. Before launch, print one real copy and check it by hand. Product IDs live in `lib/printing.ts` (8.5" square, standard color, gloss).

### 5. AI art
`AI_IMAGE_PROVIDER=fal` + `FAL_KEY` (cheapest) or `openai` + `OPENAI_API_KEY`. Generated images are copied into storage, since provider links expire.

### 6. Hosting (Vercel)
Import the repo, add every variable from `.env.example`, and set `NEXT_PUBLIC_APP_URL` to your domain. Print PDFs upload straight to Supabase Storage, so Vercel's 4.5 MB request limit doesn't apply.

---

## Known limits
- **Template art resolution:** the Higgsfield backgrounds are 1024 px, about 117 dpi at full page. They look soft in print. Upscaling all 12 to print size costs about 24 Higgsfield credits.
- **Printed copies are 8.5" square only.** The other trim sizes are for downloads/KDP.
- **Hardcover cover wrap:** with Lulu connected, the exact cover size comes from Lulu's `/cover-dimensions/`. Without Lulu the dev preview uses an estimate.
- **Saddle-stitch paperbacks** (≤ 48 pages) are padded to a multiple of 4 pages with blank pages at the end.

## Project map
```
app/                     pages, API routes (books, share, orders, uploads, media, webhooks)
components/editor/       Editor, PageStage, CharacterShape, Panels, Inspector, FamilyPanel, PrintDialog, Dialogs
components/              HeroForm, Recorder, SiteNav
lib/                     book model, starters, checks, export, sync, store, printing, lulu, fulfill, storage, db
db/schema.sql            tables (npm run db:migrate)
scripts/                 dev database, migrations, demo build
public/templates/        Higgsfield starter art
```
