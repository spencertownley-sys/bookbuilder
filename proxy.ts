// Next.js 16 renamed middleware.ts → proxy.ts. Clerk runs here; signed-out visitors to app pages go to sign-in.
// API routes check sign-in themselves (lib/server.ts) so they can answer with JSON errors.
// Public on purpose: /, /pricing, /read/*, /record/* (family links), /api/share/*, /api/media/*, webhooks.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedPage = createRouteMatcher(["/dashboard(.*)", "/editor(.*)", "/new(.*)", "/orders(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedPage(req)) await auth.protect();
});

export const config = {
  // /api/files/local is skipped: proxy buffers request bodies (10 MB cap) and print PDFs are bigger.
  matcher: ["/((?!_next|api/files/local|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"],
};
