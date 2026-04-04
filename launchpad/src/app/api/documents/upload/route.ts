/**
 * POST /api/documents/upload
 * Uploads a document to Vercel Blob storage
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireBusinessAccess } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const businessId = formData.get("businessId") as string;

    if (!file || !businessId) {
      return NextResponse.json({ error: "file and businessId required" }, { status: 400 });
    }

    await requireBusinessAccess(businessId);

    const buffer = await file.arrayBuffer();
    const filename = `${businessId}/${Date.now()}-${file.name}`;

    const blob = await put(filename, buffer, {
      access: "private",
      contentType: file.type,
    });

    return NextResponse.json({
      url: blob.url,
      filename: blob.pathname,
      size: file.size,
      type: file.type,
    });
  } catch (err) {
    console.error("document upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
