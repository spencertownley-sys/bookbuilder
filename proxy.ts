// Next.js 16 renamed middleware.ts → proxy.ts. Clerk runs here so auth() works everywhere, but the actual
// checks live next to the data they protect (Clerk's resource-based guidance):
//   - app pages call requirePageUser() (lib/page-auth.ts): sign-in, then the 18+ confirmation
//   - API routes call requireUser() (lib/server.ts) so they can answer with JSON errors
// Public on purpose: /, /pricing, legal pages, /read/* and /record/* (family links), /api/share/*,
// /api/media/*, webhooks.
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  // /api/files/local is skipped: proxy buffers request bodies (10 MB cap) and print PDFs are bigger.
  matcher: ["/((?!_next|api/files/local|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"],
};
