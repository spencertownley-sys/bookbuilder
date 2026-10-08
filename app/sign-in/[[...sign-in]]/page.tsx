import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function Page() {
  return (
    <div className="auth-wrap">
      <div className="auth-art">
        <div className="bubble">“Welcome back, storyteller! Your books missed you.” 📚</div>
      </div>
      <div className="auth-form">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Link href="/" className="brand">📖 Book<b>Builder</b></Link>
          <SignIn />
        </div>
      </div>
    </div>
  );
}
