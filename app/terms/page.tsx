import Link from "next/link";
import LegalPage, { Contact } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

export const metadata = { title: `Terms of Service — ${SITE.name}` };

export default function Terms() {
  const n = SITE.name;
  return (
    <LegalPage title="Terms of Service" updated="October 10, 2026">
      <p>
        These terms cover your use of {n}: the website, the book editor, family share links, and printed copies we arrange for you. By creating
        an account you agree to them. If you don&apos;t agree, please don&apos;t use {n}.
      </p>

      <h2>1. Your account</h2>
      <ul>
        <li>You must be 18 or older to create an account. Children may use {n} only alongside a parent, guardian or teacher who holds the account.</li>
        <li>Keep your sign-in details safe. You&apos;re responsible for what happens in your account.</li>
        <li>One person per account. Don&apos;t share accounts or make accounts for someone else.</li>
      </ul>

      <h2>2. Your books belong to you</h2>
      <ul>
        <li>You keep ownership of the words, photos and recordings you add.</li>
        <li>
          You give us permission to store, display, render and print your book only as needed to run {n} for you: saving it, showing it to people
          you share it with, making PDFs, and sending files to our printing partner when you order a copy.
        </li>
        <li>
          Only upload things you have the right to use. If a photo shows someone other than you or your own child, you need their (or their
          parent&apos;s) permission.
        </li>
        <li>Follow our <Link href="/content-policy">Content Policy</Link>. We may remove content or close accounts that break it.</li>
      </ul>

      <h2>3. Starter art and AI illustrations</h2>
      <ul>
        <li>Starter backgrounds, stickers, characters and fonts are licensed to you for use inside books you make with {n}.</li>
        <li>
          AI illustrations are made by third-party image services from the description you type. We can&apos;t promise an image is unique, and
          you&apos;re responsible for how you use it.
        </li>
        <li>
          The free plan is for personal books. Selling a book (for example on Amazon KDP) requires a paid plan. When you publish a book that
          contains AI-generated art, you must disclose it where the store asks (Amazon KDP and Apple Books both do).
        </li>
      </ul>

      <h2>4. Family share links and recording invites</h2>
      <p>
        Anyone who has a share or recording link can open it without signing in. Share links are unlisted and hidden from search engines, but
        anyone you forward a link to can use it. You can turn a link off at any time and it stops working immediately.
      </p>

      <h2>5. Plans and payments</h2>
      <ul>
        <li>Payments are processed by Stripe. We never see or store your full card number.</li>
        <li>
          Subscriptions (Storyteller and Publisher) renew automatically each month or year until you cancel. You can cancel any time from
          <em> Manage billing</em> on your bookshelf; you keep paid features until the end of the period you paid for.
        </li>
        <li>A Keepsake unlock is a one-time purchase for one book and never expires.</li>
        <li>Prices are shown before you pay. Sales tax is added at checkout where it applies.</li>
      </ul>

      <h2>6. Printed copies</h2>
      <ul>
        <li>
          Printed copies are made to order and shipped by our printing partner, Lulu. Shipping times are estimates. Your name, the delivery address,
          phone number and the print files are shared with Lulu to make and deliver the book.
        </li>
        <li>Before you order, the print check shows problems we can detect. You&apos;re responsible for the content and spelling in your book.</li>
        <li>
          Because each book is personalized, we can&apos;t accept returns for a change of mind. If a book arrives damaged or misprinted, tell us
          within 30 days with a photo and we&apos;ll reprint it or refund you.
        </li>
        <li>An order includes the Keepsake unlock for that book at no extra charge.</li>
      </ul>

      <h2>7. Ending your account</h2>
      <p>
        You can delete your account at any time from the Account page. Deleting it cancels any subscription and removes your books, files,
        recordings and share links as described in our <Link href="/privacy">Privacy Policy</Link>. We may suspend or close accounts that break
        these terms or put children or other users at risk.
      </p>

      <h2>8. The legal bits</h2>
      <ul>
        <li>
          {n} is provided &quot;as is&quot;. We work hard to keep it running and your books safe, but we can&apos;t promise it will always be
          available or error-free. Keep your own copies of anything important, for example by downloading a PDF.
        </li>
        <li>
          To the extent the law allows, our total liability for any claim is limited to the amount you paid us in the 12 months before it. Nothing
          here limits rights you have under consumer protection law.
        </li>
        <li>We may update these terms. If a change matters, we&apos;ll tell you in the app or by email before it takes effect.</li>
        <li>These terms are governed by the laws of [state / country], without regard to conflict-of-law rules.</li>
      </ul>

      <h2>9. Contact</h2>
      <p>Questions about these terms: <Contact />.</p>
    </LegalPage>
  );
}
