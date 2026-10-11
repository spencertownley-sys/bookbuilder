import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import { SITE } from "@/lib/site";

/** Shared frame for Terms, Privacy and Content Policy. */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main className="section legal">
        <h1>{title}</h1>
        <p className="hint">Last updated {updated}</p>
        {/* Remove this notice once a lawyer has reviewed the text (a launch gate in the PRD). */}
        <p className="notice">This is a working draft and is pending legal review.</p>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

export function Contact() {
  return SITE.supportEmail ? <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> : <span>[support email]</span>;
}
