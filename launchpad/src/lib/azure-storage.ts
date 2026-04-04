/**
 * File storage client — server-side only.
 * Uses Vercel Blob Storage. Requires BLOB_READ_WRITE_TOKEN env var.
 * Set it in .env.local and in Vercel Project Settings → Environment Variables.
 *
 * To get a token: vercel.com/dashboard → your project → Storage → Blob → Create Store
 * (or run: npx vercel blob)
 */
import { put, del } from "@vercel/blob";

/**
 * Upload a buffer to Vercel Blob Storage.
 * Returns the public URL of the uploaded blob.
 */
export async function uploadBlob(
  _containerName: string,   // ignored — kept for API compatibility
  blobName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { url } = await put(blobName, buffer, {
    access: "public",
    contentType,
  });
  return url;
}

/**
 * Delete a blob by path.
 * Vercel Blob uses the full URL for deletion.
 */
export async function deleteBlob(_containerName: string, blobUrl: string): Promise<void> {
  await del(blobUrl);
}
