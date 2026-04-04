/**
 * Fetch a URL with a small number of retries.
 * Used as a fallback when the client sends a blob URL instead of base64.
 * Keep retries low — the blob URL should be immediately available after upload.
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 2,
  delayMs = 100
) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      lastError = new Error(`Failed to fetch file (HTTP ${response.status})`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Failed to fetch file");
    }

    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError ?? new Error("Failed to fetch file");
}
