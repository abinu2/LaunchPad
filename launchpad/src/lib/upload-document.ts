"use client";

import { upload } from "@vercel/blob/client";
import { buildBusinessBlobPath } from "@/lib/blob-upload";

type UploadDocumentArgs = {
  file: File;
  businessId: string;
  folder: string;
  onProgress?: (percentage: number) => void;
};

type UploadDocumentResult = {
  url: string;
  pathname?: string;
  contentType: string;
};

async function fallbackServerUpload({
  file,
  businessId,
  folder,
}: UploadDocumentArgs): Promise<UploadDocumentResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("businessId", businessId);
  formData.append("folder", folder);

  const response = await fetch("/api/documents/upload", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as {
    error?: string;
    url?: string;
    path?: string;
    mimeType?: string;
  };

  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? "Upload failed");
  }

  return {
    url: payload.url,
    pathname: payload.path,
    contentType: payload.mimeType ?? file.type,
  };
}

export async function uploadDocumentFromBrowser(args: UploadDocumentArgs): Promise<UploadDocumentResult> {
  const { file, businessId, folder, onProgress } = args;
  const blobPath = buildBusinessBlobPath({
    businessId,
    folder,
    fileName: file.name,
  });

  try {
    const uploadedBlob = await upload(blobPath, file, {
      access: "public",
      contentType: file.type,
      handleUploadUrl: "/api/documents/client-upload",
      clientPayload: JSON.stringify({
        businessId,
        folder,
        originalFileName: file.name,
      }),
      multipart: file.size > 5 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => {
        onProgress?.(percentage);
      },
    });

    return {
      url: uploadedBlob.url,
      pathname: uploadedBlob.pathname,
      contentType: uploadedBlob.contentType ?? file.type,
    };
  } catch {
    return fallbackServerUpload(args);
  }
}
