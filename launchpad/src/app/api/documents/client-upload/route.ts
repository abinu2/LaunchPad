import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireBusinessAccess } from "@/lib/api-auth";
import {
  DOCUMENT_UPLOAD_ALLOWED_TYPE_LIST,
  DOCUMENT_UPLOAD_MAX_BYTES,
  sanitizeUploadFileName,
} from "@/lib/blob-upload";

type ClientUploadPayload = {
  businessId?: string;
  folder?: string;
  originalFileName?: string;
};

function parseClientPayload(rawPayload: string | null): ClientUploadPayload {
  if (!rawPayload) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawPayload) as ClientUploadPayload;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = parseClientPayload(clientPayload);
        const businessId = payload.businessId?.trim();
        const folder = payload.folder?.trim() || "documents";
        const originalFileName = payload.originalFileName?.trim();

        if (!businessId || !originalFileName) {
          throw new Error("businessId and originalFileName are required");
        }

        await requireBusinessAccess(businessId);

        const expectedPrefix = `businesses/${businessId}/${folder}/`;
        const expectedFileName = sanitizeUploadFileName(originalFileName);

        if (!pathname.startsWith(expectedPrefix) || !pathname.endsWith(expectedFileName)) {
          throw new Error("Invalid upload path");
        }

        return {
          allowedContentTypes: DOCUMENT_UPLOAD_ALLOWED_TYPE_LIST,
          maximumSizeInBytes: DOCUMENT_UPLOAD_MAX_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({
            businessId,
            folder,
            originalFileName,
          }),
        };
      },
      onUploadCompleted: async () => {
        // The app analyzes the uploaded file immediately after the client upload finishes.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("client-upload error:", error);
    const message = error instanceof Error ? error.message : "Upload authorization failed";
    const status =
      message.includes("Unauthorized")
        ? 401
        : message.includes("Forbidden")
        ? 403
        : message.includes("required") || message.includes("Invalid upload path")
        ? 400
        : 500;

    return NextResponse.json(
      { error: message.includes("BLOB_READ_WRITE_TOKEN") ? message : message || "Upload authorization failed" },
      { status }
    );
  }
}
