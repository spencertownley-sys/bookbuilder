import { putFile } from "@/lib/storage";
import { HttpError, json, requireUser, route } from "@/lib/server";

const MAX = 12 * 1024 * 1024;

// POST multipart form with "file": stores an image the user added (drawings, photos).
export const POST = route(async (req: Request) => {
  const { userId } = await requireUser();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose an image to upload.");
  if (!file.type.startsWith("image/")) throw new HttpError(400, "Only images can be added to pages.");
  if (file.size > MAX) throw new HttpError(413, "That image is over 12 MB. Try a smaller one.");
  const saved = await putFile({ folder: "uploads", data: await file.arrayBuffer(), mimeType: file.type, ownerId: userId });
  return json(saved, 201);
});
