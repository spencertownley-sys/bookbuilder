import { createUploadTarget } from "@/lib/storage";
import { HttpError, json, requireUser, route } from "@/lib/server";

// POST { mimeType, purpose } — returns a one-time URL the browser uploads a large file to.
export const POST = route(async (req: Request) => {
  const { userId } = await requireUser();
  const { mimeType, purpose } = (await req.json()) as { mimeType: string; purpose: "print" };
  if (purpose !== "print" || mimeType !== "application/pdf") throw new HttpError(400, "Only print PDFs can be uploaded this way.");
  return json(await createUploadTarget("print", mimeType, userId), 201);
});
