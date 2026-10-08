import { getCurrentPlan } from "@/lib/plan-server";
import EditorClient from "./EditorClient";

export const metadata = { title: "Editor — Book Builder" };

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getCurrentPlan();
  return <EditorClient bookId={id} plan={plan} />;
}
