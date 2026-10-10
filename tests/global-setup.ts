import { execFileSync } from "node:child_process";
import { clerkSetup } from "@clerk/testing/playwright";

// Applies the schema, loads .env.local, and fetches a Clerk testing token so sign-ups and sign-ins
// skip Clerk's bot protection.
export default async function globalSetup() {
  execFileSync("node", ["scripts/migrate.mjs"], { stdio: "inherit" });
  await clerkSetup();
}
