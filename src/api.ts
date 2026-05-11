import type { FlattenedSpacesData, Site } from "./types";

const defaultBase = "/api/v1";

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_DEV_API_PROXY_TARGET || "http://127.0.0.1:5050/api/v1";
  if (typeof raw === "string" && raw.trim()) {
    return raw.replace(/\/$/, "");
  }
  return defaultBase;
}

async function readErrorMessage(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body: unknown = await res.json();
      if (
        body &&
        typeof body === "object" &&
        "error" in body &&
        typeof (body as { error: unknown }).error === "string"
      ) {
        return (body as { error: string }).error;
      }
    } catch {
      /* fall through */
    }
    return res.statusText || "Request failed";
  }
  const text = await res.text();
  return text.trim() || res.statusText || "Request failed";
}

export async function fetchSites(): Promise<{ sites: Site[] }> {
  const res = await fetch(`${getApiBaseUrl()}/sites`);
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return (await res.json()) as { sites: Site[] };
}

export async function fetchSpaces(
  siteId: number
): Promise<FlattenedSpacesData> {
  const params = new URLSearchParams({ siteId: String(siteId) });
  const res = await fetch(`${getApiBaseUrl()}/spaces?${params.toString()}`);
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return (await res.json()) as FlattenedSpacesData;
}

export async function createStream(
  spaceId: number,
  name: string
): Promise<{ stream: { id: number; name: string } }> {
  const res = await fetch(`${getApiBaseUrl()}/spaces/${spaceId}/streams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return (await res.json()) as { stream: { id: number; name: string } };
}

export async function deleteStream(streamId: number): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/streams/${streamId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
}
