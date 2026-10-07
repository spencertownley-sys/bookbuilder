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
          <Link href="/" className="brand">📖 Book<b>ling</b></Link>
          <SignUp />
        </div>
      </div>
    </div>
  );
}
