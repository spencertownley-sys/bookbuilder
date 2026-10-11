import Link from "next/link";
import { SITE } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="footer site-footer">
      <nav aria-label="Footer">
        <Link href="/pricing">Pricing</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/content-policy">Content policy</Link>
        {SITE.supportEmail && <a href={`mailto:${SITE.supportEmail}`}>Help</a>}
      </nav>
      <p>© {new Date().getFullYear()} {SITE.name} · Made for storytellers of every size</p>
    </footer>
  );
}
