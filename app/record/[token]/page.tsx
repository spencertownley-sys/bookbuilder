import type { Metadata } from "next";
import RecordClient from "./RecordClient";

export const metadata: Metadata = { title: "Record a story", robots: { index: false, follow: false } };

export default async function RecordPage({ params }: { params: Promise<{ token: string }> }) {
  return <RecordClient token={(await params).token} />;
}
