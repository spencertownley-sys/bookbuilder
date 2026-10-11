import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function Page() {
  return (
    <div className="auth-wrap">
      <div className="auth-art" style={{ backgroundImage: "url(/templates/backgrounds/space.jpg)" }}>
        <div className="bubble">“Every great author started with one page. Let&apos;s make yours.” ✨</div>
      </div>
      <div className="auth-form">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Link href="/" className="brand">📖 Book<b>Builder</b></Link>
          <SignUp />
          <p className="fineprint" style={{ maxWidth: 380, textAlign: "center" }}>
            Accounts are for adults 18 and over. By signing up you agree to our <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
