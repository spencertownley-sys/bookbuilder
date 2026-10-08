"use client";
// Small browser helpers for the app's API.

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const r = await fetch("/api/uploads", { method: "POST", body: form });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "Upload failed");
  return j.url as string;
}

/** Uploads a large file (print PDF) straight to storage. Returns its storage key. */
export async function uploadPrintFile(blob: Blob): Promise<string> {
  const t = await fetch("/api/files/upload-target", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mimeType: "application/pdf", purpose: "print" }),
  });
  const target = await t.json();
  if (!t.ok) throw new Error(target.error ?? "Couldn't start the upload");
  const r = await fetch(target.uploadUrl, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: blob });
  if (!r.ok) throw new Error("The print file didn't upload. Check your connection and try again.");
  return target.key as string;
}

export async function postJson<T = Record<string, unknown>>(url: string, body: unknown, method = "POST"): Promise<T> {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? "Something went wrong");
  return j as T;
}
