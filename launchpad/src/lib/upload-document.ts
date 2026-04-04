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
  onProgress,
}: UploadDocumentArgs): Promise<UploadDocumentResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("businessId", businessId);
  formData.append("folder", folder);

  // Use XMLHttpRequest for progress tracking on the fallback path
  return new Promise<UploadDocumentResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents/upload");

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      try {
        const payload = JSON.parse(xhr.responseText) as {
          error?: string;
          url?: string;
          path?: string;
          mimeType?: string;
        };

        if (xhr.status >= 400 || !payload.url) {
          reject(new Error(payload.error ?? `Upload failed (HTTP ${xhr.status})`));
          return;
        }

        resolve({
          url: payload.url,
          pathname: payload.path,
          contentType: payload.mimeType ?? file.type,
        });
      } catch {
        reject(new Error("Upload failed — invalid server response"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed — network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.send(formData);
  });
}

export async function uploadDocumentFromBrowser(
  args: UploadDocumentArgs
): Promise<UploadDocumentResult> {
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
  } catch (primaryError) {
    // Primary Vercel Blob client upload failed — fall back to server upload.
    // Common causes: callback URL unreachable (local dev), token issues, network.
    console.warn(
      "Vercel Blob client upload failed, falling back to server upload:",
      primaryError instanceof Error ? primaryError.message : primaryError
    );

    // Reset progress for the fallback attempt so the caller sees movement
    onProgress?.(0);

    return fallbackServerUpload(args);
  }
}
