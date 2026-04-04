const ALLOWED_DOCUMENT_UPLOAD_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

export const DOCUMENT_UPLOAD_ALLOWED_TYPES = new Set(ALLOWED_DOCUMENT_UPLOAD_TYPES);
export const DOCUMENT_UPLOAD_ALLOWED_TYPE_LIST = [...ALLOWED_DOCUMENT_UPLOAD_TYPES];
export const DOCUMENT_UPLOAD_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

export function isAllowedDocumentUploadType(mimeType: string) {
  return DOCUMENT_UPLOAD_ALLOWED_TYPES.has(mimeType);
}

export function sanitizeUploadFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function buildBusinessBlobPath({
  businessId,
  folder,
  fileName,
}: {
  businessId: string;
  folder: string;
  fileName: string;
}) {
  return `businesses/${businessId}/${folder}/${Date.now()}_${sanitizeUploadFileName(fileName)}`;
}
