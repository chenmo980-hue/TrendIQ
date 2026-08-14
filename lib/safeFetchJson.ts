/**
 * Client-side robust JSON fetch helper that captures HTML error responses and extracts meaningful messages
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);
  const text = await response.text();

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const json = JSON.parse(text);
      errorMsg = json.error || json.message || errorMsg;
    } catch {
      // If server returned HTML (e.g. 500 error page)
      const snippet = text.slice(0, 120).replace(/<[^>]*>/g, ' ').trim();
      errorMsg = `${errorMsg}: ${snippet || 'Unknown error'}`;
    }
    throw new Error(errorMsg);
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    const snippet = text.slice(0, 120).replace(/<[^>]*>/g, ' ').trim();
    throw new Error(`Invalid JSON response: ${snippet}`);
  }
}
