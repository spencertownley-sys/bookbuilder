import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";

export default function SiteNav() {
  return (
    <nav className="site-nav">
      <Link href="/" className="brand">📖 Book<b>ling</b></Link>
      <span className="spacer" />
      <Link href="/pricing" className="link">Pricing</Link>
      <Show when="signed-out">
        <Link href="/sign-in" className="link">Log in</Link>
        <Link href="/sign-up" className="btn primary">Start free</Link>
      </Show>
      <Show when="signed-in">
        <Link href="/dashboard" className="btn ghost">My books</Link>
        <UserButton />
      </Show>
    </nav>
  );
}
