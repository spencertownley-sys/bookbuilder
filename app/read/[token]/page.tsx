import type { Metadata } from "next";
import ReaderClient from "./ReaderClient";

export const metadata: Metadata = { title: "A book made with love", robots: { index: false, follow: false } };

export default async function ReadPage({ params }: { params: Promise<{ token: string }> }) {
  return <ReaderClient token={(await params).token} />;
}
