import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { put } from "@vercel/blob";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const businessId = form.get("businessId") as string | null;
    const folder = (form.get("folder") as string | null) ?? "documents";

    if (!file || !businessId) {
      return NextResponse.json({ error: "file and businessId are required" }, { status: 400 });
    }

    await requireBusinessAccess(businessId);

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 20 MB limit" }, { status: 413 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blobPath = `businesses/${businessId}/${folder}/${Date.now()}_${safeName}`;

    const { url } = await put(blobPath, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ url, path: blobPath, name: file.name, mimeType: file.type });
  } catch (err) {
    console.error("upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    const isConfig =
      message.includes("BLOB_READ_WRITE_TOKEN") ||
      message.includes("Unauthorized") ||
      message.includes("Forbidden");
    return NextResponse.json({ error: isConfig ? message : "Upload failed" }, { status: 500 });
  }
}
