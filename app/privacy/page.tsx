import LegalPage, { Contact } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata = { title: `Privacy Policy — ${SITE.name}` };

export default function Privacy() {
  const n = SITE.name;
  return (
    <LegalPage title="Privacy Policy" updated="October 10, 2026">
      <p>
        {n} helps grown-ups make picture books starring the children they love. That means we handle personal details about kids, and we take
        that seriously. The short version: we use what you give us only to make, share and print your book; we never sell it; we never use it to
        train AI; and you can delete it at any time.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Account details:</b> your name, email address and sign-in method, handled by our login provider, Clerk.</li>
        <li>
          <b>Your books:</b> pages, text, the hero&apos;s name, pronouns and look, an optional dedication photo, images you upload, and voice
          recordings you or your invited relatives make.
        </li>
        <li><b>Family reactions:</b> hearts, and notes with the name a viewer types, left on a share link.</li>
        <li><b>Orders:</b> the recipient&apos;s name, delivery address, phone number (for the courier) and an email for order updates.</li>
        <li><b>Payments:</b> handled by Stripe. We receive whether a payment succeeded, never your full card number.</li>
        <li>
          <b>Product events:</b> a small set of events stored on our own servers (for example &quot;book created&quot; or &quot;order paid&quot;)
          so we can tell whether {n} is working. We don&apos;t use advertising trackers.
        </li>
      </ul>

      <h2>Children</h2>
      <ul>
        <li>Accounts are for adults 18 and over. We don&apos;t knowingly collect personal information directly from children under 13.</li>
        <li>
          Details about a child that a parent or relative adds to a book are used only to make that book. They are private to the account, are
          never public, are never sold, and are never used to train AI models.
        </li>
        <li>We don&apos;t turn children&apos;s photos into AI images.</li>
        <li>If you believe a child has created an account, contact us and we&apos;ll delete it.</li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To save your books and show them on any device you sign in on.</li>
        <li>To show a book to the people you share a link with, and to let invited relatives record narration.</li>
        <li>To make print files and have your order printed and delivered.</li>
        <li>To take payments, prevent fraud and abuse, and answer your questions.</li>
        <li>To understand, in aggregate, which parts of {n} help people finish books.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>Only the service providers that run {n} for us, under contracts that limit them to that job:</p>
      <ul>
        <li>Clerk (sign-in), our database and file storage host (Supabase), and our web host.</li>
        <li>Stripe (payments and sales tax).</li>
        <li>Lulu (printing and shipping): the print files, recipient name, address, phone and order email.</li>
        <li>
          Our AI image provider, when you choose to paint a picture with AI: only the description you type is sent. Avoid putting a child&apos;s
          full name in a description.
        </li>
      </ul>
      <p>We may also disclose information when the law requires it, or to protect a child or someone else from harm.</p>

      <h2>Share links</h2>
      <p>
        Share and recording links are long random addresses, hidden from search engines, and work only while you leave them on. Anyone who has a
        link can open it, so share it only with people you trust. Turning a link off stops it working immediately.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Books stay until you delete them. Deleting a book removes its pages, photos, uploaded images, recordings, notes and share links.</li>
        <li>Deleting your account removes all your books, files, recordings and share links within 30 days and cancels any subscription.</li>
        <li>
          We keep order and payment records (what was ordered, the delivery address and the amount paid) for as long as tax and accounting law
          requires. Print files are deleted once the order has shipped.
        </li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>Edit or delete any book from your bookshelf, and download a PDF copy at any time.</li>
        <li>Delete your whole account from the Account page.</li>
        <li>Ask us for a copy of your information or to correct it: <Contact />.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit. Files are stored privately and served only through {n}. Database access is restricted to our servers.
      </p>

      <h2>Changes and contact</h2>
      <p>If we change this policy in a way that matters, we&apos;ll tell you in the app or by email first. Questions: <Contact />.</p>
    </LegalPage>
  );
}
