// Site-wide constants. The product name is still a working name; change it here for new pages.
export const SITE = {
  name: "Book Builder",
  // Shown on legal pages and help text. Set NEXT_PUBLIC_SUPPORT_EMAIL before launch.
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
};

// Bump when the Terms or Privacy Policy change in a way users must accept again.
export const TERMS_VERSION = "2026-10-10";

/** Accounts are for adults: the 18+ confirmation lives in Clerk publicMetadata (writable only by our server). */
export function isAdultConfirmed(publicMetadata: unknown) {
  return Boolean((publicMetadata as { adultConfirmedAt?: string } | null | undefined)?.adultConfirmedAt);
}

/** Only allow same-site paths as a post-login destination (no open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  // Browsers drop tabs/newlines and treat "\\" like "/", so "/\t/evil.com" would become "//evil.com".
  if (!next || !next.startsWith("/") || /[\s\\\x00-\x1f\x7f]/.test(next)) return fallback;
  try {
    const u = new URL(next, "https://same.invalid");
    return u.origin === "https://same.invalid" ? u.pathname + u.search + u.hash : fallback;
  } catch {
    return fallback;
  }
}

/** Reasons a share-link viewer can pick when reporting a book. */
export const REPORT_REASONS = ["Inappropriate content", "Privacy: this shows my child or me", "Copyright", "Spam", "Something else"] as const;
