import { requirePageUser } from "@/lib/page-auth";
import EditorClient from "./EditorClient";

export const metadata = { title: "Editor — Book Builder" };

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { plan } = await requirePageUser(`/editor/${id}`);
  return <EditorClient bookId={id} plan={plan} />;
}
