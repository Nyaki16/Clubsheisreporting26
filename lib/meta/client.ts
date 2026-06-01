// Meta Graph API client for ad-level data.
// Uses a long-lived system user token in META_ACCESS_TOKEN.

const GRAPH_VERSION = "v22.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export class MetaApiError extends Error {
  status: number;
  code?: number;
  fbtraceId?: string;

  constructor(message: string, status: number, code?: number, fbtraceId?: string) {
    super(message);
    this.name = "MetaApiError";
    this.status = status;
    this.code = code;
    this.fbtraceId = fbtraceId;
  }
}

function getToken(): string {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    throw new MetaApiError("META_ACCESS_TOKEN environment variable is not set", 500);
  }
  return token;
}

async function graphRequest<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", getToken());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) {
    let message = `Meta API ${res.status}`;
    let code: number | undefined;
    let fbtraceId: string | undefined;
    try {
      const body = await res.json();
      if (body?.error) {
        message = body.error.message || message;
        code = body.error.code;
        fbtraceId = body.error.fbtrace_id;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new MetaApiError(message, res.status, code, fbtraceId);
  }
  return res.json();
}

// Walks paging.next links until exhausted. Each page is a Meta cursor-paginated response.
async function paginate<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const all: T[] = [];
  let nextUrl: string | null = null;
  let first = true;

  while (first || nextUrl) {
    let res: Response;
    if (first) {
      const url = new URL(`${GRAPH_BASE}${path}`);
      url.searchParams.set("access_token", getToken());
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      first = false;
    } else {
      res = await fetch(nextUrl!, { headers: { Accept: "application/json" } });
    }

    if (!res.ok) {
      let message = `Meta API ${res.status}`;
      try {
        const body = await res.json();
        if (body?.error) message = body.error.message || message;
      } catch {}
      throw new MetaApiError(message, res.status);
    }

    const body = (await res.json()) as { data: T[]; paging?: { next?: string } };
    if (Array.isArray(body.data)) all.push(...body.data);
    nextUrl = body.paging?.next || null;
  }
  return all;
}

export const meta = { graphRequest, paginate };
