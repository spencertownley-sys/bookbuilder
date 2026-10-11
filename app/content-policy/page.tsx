import LegalPage, { Contact } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata = { title: `Content Policy — ${SITE.name}` };

export default function ContentPolicy() {
  return (
    <LegalPage title="Content Policy" updated="October 10, 2026">
      <p>
        {SITE.name} is a place to make books for children. Everything you make, share or print here should be something you&apos;d happily read
        aloud to a child.
      </p>

      <h2>Not allowed</h2>
      <ul>
        <li>
          Any content that sexualizes children, in any form. We remove it, close the account, and report it to the National Center for Missing &amp;
          Exploited Children and law enforcement.
        </li>
        <li>Sexual or nude content of anyone.</li>
        <li>Graphic violence, gore, self-harm, or content meant to frighten or upset children.</li>
        <li>Hate, harassment, or bullying aimed at a person or group.</li>
        <li>Content that promotes illegal activity, drugs or weapons.</li>
        <li>Photos or personal details of a child or adult without permission from them or their parent.</li>
        <li>Copyrighted characters, artwork or text you don&apos;t have rights to, especially in books you sell.</li>
        <li>Spam, scams, or using share links and notes to advertise.</li>
      </ul>

      <h2>AI illustrations</h2>
      <ul>
        <li>AI pictures are filtered for kid-safe content, but you&apos;re responsible for what you keep in your book.</li>
        <li>Don&apos;t try to work around the filters, or to make AI images that look like a specific real child.</li>
        <li>If you publish a book with AI art, disclose it where the store asks (Amazon KDP and Apple Books require this).</li>
      </ul>

      <h2>Notes on shared books</h2>
      <p>
        Hearts and notes from family are plain text. Authors can remove any note and report it to us. Keep notes kind; they&apos;re read by the
        family and often by the child.
      </p>

      <h2>Reporting</h2>
      <p>
        Every shared book has a <b>Report</b> link, and authors can report notes from the Family panel. You can also write to <Contact />. We
        review reports and may remove content, turn off share links, or suspend accounts.
      </p>
    </LegalPage>
  );
}
