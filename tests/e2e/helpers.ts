import { createClerkClient } from "@clerk/backend";
import { clerk } from "@clerk/testing/playwright";
import type { Browser, BrowserContextOptions, Page } from "@playwright/test";
import postgres from "postgres";

export const PASSWORD = "Story-time-2026!";
const created: string[] = [];

export const clerkApi = () => createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

let _db: postgres.Sql | null = null;
export const db = () => (_db ??= postgres(process.env.DATABASE_URL!, { max: 1, prepare: false, onnotice: () => {} }));

export const testEmail = (tag: string) => `bb-e2e-${tag}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}+clerk_test@example.com`;

/** Creates a Clerk user (by default already past the 18+ confirmation). */
export async function createUser(opts: { adult?: boolean; email?: string } = {}) {
  const email = opts.email ?? testEmail("user");
  const existing = await clerkApi().users.getUserList({ emailAddress: [email] });
  const u =
    existing.data[0] ??
    (await clerkApi().users.createUser({
      emailAddress: [email],
      password: PASSWORD,
      skipPasswordChecks: true,
      publicMetadata: opts.adult === false ? {} : { adultConfirmedAt: new Date().toISOString(), termsVersion: "e2e" },
    }));
  if (!opts.email) created.push(u.id);
  return { id: u.id, email };
}

export async function signIn(page: Page, user: { email: string }) {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: user.email });
}

/** Removes the Clerk users this test file created. */
export async function cleanupUsers() {
  for (const id of created.splice(0)) await clerkApi().users.deleteUser(id).catch(() => {});
}

export const phone: BrowserContextOptions = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

/** A fresh browser profile, e.g. a relative opening a share link on their phone. */
export async function newVisitor(browser: Browser, opts: BrowserContextOptions = phone) {
  const ctx = await browser.newContext({ ...opts, baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  return { ctx, page: await ctx.newPage() };
}

/** A tiny valid PNG (for upload tests). */
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
