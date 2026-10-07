import { auth } from "@clerk/nextjs/server";
import { getCurrentPlan } from "@/lib/plan-server";
import EditorClient from "./EditorClient";

export const metadata = { title: "Editor — Bookling" };

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  const plan = await getCurrentPlan();
  return <EditorClient bookId={id} userId={userId!} plan={plan} />;
}
