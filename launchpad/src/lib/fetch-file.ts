export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 5,
  delayMs = 750
) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }

      lastError = new Error(`Failed to fetch file (${response.status})`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Failed to fetch file");
    }

    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError ?? new Error("Failed to fetch file");
}
