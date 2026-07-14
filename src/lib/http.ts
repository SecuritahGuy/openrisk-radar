function isHtml(contentType: string, body: string): boolean {
  return contentType.includes("text/html") || /^\s*<!doctype html/i.test(body);
}

function contentType(response: Response): string {
  return response.headers?.get?.("content-type")?.toLowerCase() ?? "";
}

async function responseText(response: Response): Promise<string> {
  if (typeof response.text === "function") return response.text();
  return JSON.stringify(await response.json());
}

export async function readJsonResponse<T>(response: Response, provider: string): Promise<T> {
  if (!response.ok) throw new Error(`${provider} returned ${response.status}`);

  const body = await responseText(response);
  if (isHtml(contentType(response), body)) {
    throw new Error(`${provider} proxy is unavailable; the server returned the app shell instead of data`);
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`${provider} returned an invalid JSON response`);
  }
}

export async function readTextResponse(response: Response, provider: string): Promise<string> {
  if (!response.ok) throw new Error(`${provider} returned ${response.status}`);

  const body = await responseText(response);
  if (isHtml(contentType(response), body)) {
    throw new Error(`${provider} proxy is unavailable; the server returned the app shell instead of data`);
  }
  return body;
}
