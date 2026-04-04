/**
 * Azure Blob Storage client — server-side only.
 * Import only in API routes.
 */
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

let _blobClient: BlobServiceClient | null = null;

function getBlobClient(): BlobServiceClient {
  if (!_blobClient) {
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connStr) throw new Error("AZURE_STORAGE_CONNECTION_STRING must be set");
    _blobClient = BlobServiceClient.fromConnectionString(connStr);
  }
  return _blobClient;
}

export function getContainerClient(containerName: string): ContainerClient {
  return getBlobClient().getContainerClient(containerName);
}

/**
 * Upload a buffer to Azure Blob Storage.
 * Returns the public URL of the uploaded blob.
 */
export async function uploadBlob(
  containerName: string,
  blobName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const containerClient = getContainerClient(containerName);
  // Create container if it doesn't exist
  await containerClient.createIfNotExists({ access: "blob" });

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return blockBlobClient.url;
}

/**
 * Delete a blob by URL or name.
 */
export async function deleteBlob(containerName: string, blobName: string): Promise<void> {
  const containerClient = getContainerClient(containerName);
  await containerClient.deleteBlob(blobName);
}
