-- Book Builder schema. Safe to run more than once (npm run db:migrate).
-- Works on any Postgres 14+: Supabase, Neon, Vercel Postgres, or the local PGlite dev server.

create table if not exists books (
  id                 text primary key,
  owner_id           text not null,             -- Clerk user id
  title              text not null default 'My Story',
  data               jsonb not null,             -- the whole book (pages, elements, hero)
  version            integer not null default 1, -- bumps on every save; used to detect edits from two devices
  keepsake_unlocked  boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists books_owner_idx on books (owner_id, updated_at desc);

-- Family share links ("read") and voice-recording invites ("record").
create table if not exists share_links (
  token       text primary key,
  book_id     text not null references books(id) on delete cascade,
  kind        text not null check (kind in ('read', 'record')),
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);
create index if not exists share_links_book_idx on share_links (book_id);

-- Hearts and short notes left by family on a shared book.
create table if not exists page_notes (
  id          bigserial primary key,
  book_id     text not null references books(id) on delete cascade,
  page_id     text not null,
  kind        text not null check (kind in ('heart', 'note')),
  author_name text,
  body        text check (char_length(body) <= 280),
  created_at  timestamptz not null default now()
);
create index if not exists page_notes_book_idx on page_notes (book_id, created_at desc);

-- One narration per page; re-recording replaces it.
create table if not exists recordings (
  book_id      text not null references books(id) on delete cascade,
  page_id      text not null,
  file_key     text not null,
  mime_type    text not null,
  duration_ms  integer,
  recorded_by  text,
  created_at   timestamptz not null default now(),
  primary key (book_id, page_id)
);

-- Uploaded and generated files (images, recordings, print PDFs).
create table if not exists files (
  key         text primary key,
  owner_id    text,
  mime_type   text not null,
  size_bytes  integer,
  created_at  timestamptz not null default now()
);

-- Printed-copy orders.
create table if not exists orders (
  id                 text primary key,
  owner_id           text not null,
  book_id            text not null references books(id) on delete cascade,
  book_title         text not null,
  format             text not null check (format in ('hardcover', 'paperback')),
  pod_package_id     text not null,
  page_count         integer not null,
  quantity           integer not null check (quantity between 1 and 50),
  shipping_level     text not null default 'MAIL',
  ship_to            jsonb not null,
  contact_email      text not null,
  price_cents        integer not null,
  shipping_cents     integer not null,
  status             text not null default 'awaiting_payment',
  -- awaiting_payment -> paid -> submitted -> in_production -> shipped -> delivered (or canceled / error)
  interior_key       text not null,
  cover_key          text not null,
  stripe_session_id  text,
  lulu_job_id        text,
  lulu_status        text,
  tracking_url       text,
  error              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists orders_owner_idx on orders (owner_id, created_at desc);

-- All access goes through the app's server with its own auth checks, so row-level
-- security stays on with no public policies (Supabase's anon key can read nothing).
alter table books        enable row level security;
alter table share_links  enable row level security;
alter table page_notes   enable row level security;
alter table recordings   enable row level security;
alter table files        enable row level security;
alter table orders       enable row level security;
