import { getActiveLink, json, route } from "@/lib/server";
import { saveRecording } from "@/lib/recordings";

// Public, but only through a "record" invite link: a relative records narration for a page.
export const POST = route(async (req: Request, { params }: { params: Promise<{ token: string; pageId: string }> }) => {
  const { token, pageId } = await params;
  const link = await getActiveLink(token, "record");
  const name = new URL(req.url).searchParams.get("name");
  return json({ recording: await saveRecording(req, link.book_id, pageId, name, null) }, 201);
});
