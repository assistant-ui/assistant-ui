import { type NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

type OriginCheck = "allowed" | "forbidden" | "misconfigured";

function checkRequestOrigin(req: NextRequest): OriginCheck {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite !== null) {
    return fetchSite === "same-origin" || fetchSite === "none"
      ? "allowed"
      : "forbidden";
  }

  const origin = req.headers.get("origin");
  if (origin === null) return "allowed";

  const configuredOrigin = process.env.APP_ORIGIN?.trim();
  let expectedOrigin = req.nextUrl.origin;
  if (configuredOrigin) {
    try {
      const url = new URL(configuredOrigin);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "misconfigured";
      }
      expectedOrigin = url.origin;
    } catch {
      return "misconfigured";
    }
  }

  try {
    return new URL(origin).origin === expectedOrigin ? "allowed" : "forbidden";
  } catch {
    return "forbidden";
  }
}

function crossOriginResponse() {
  return NextResponse.json(
    { error: "Cross-origin requests are not allowed." },
    { status: 403 },
  );
}

function invalidAppOriginResponse() {
  return NextResponse.json(
    { error: "APP_ORIGIN must be an absolute HTTP(S) origin." },
    { status: 500 },
  );
}

function originErrorResponse(req: NextRequest) {
  const result = checkRequestOrigin(req);
  if (result === "misconfigured") return invalidAppOriginResponse();
  if (result === "forbidden") return crossOriginResponse();
  return null;
}

async function handleRequest(req: NextRequest, method: string) {
  const originError = originErrorResponse(req);
  if (originError) return originError;

  try {
    const apiUrl = process.env.LANGGRAPH_API_URL?.trim();
    if (!apiUrl) {
      return NextResponse.json(
        { error: "LANGGRAPH_API_URL is not configured." },
        { status: 503 },
      );
    }

    const path = req.nextUrl.pathname.replace(/^\/?api\//, "");
    const searchParams = new URLSearchParams(req.nextUrl.search);
    searchParams.delete("_path");
    searchParams.delete("nxtP_path");
    const queryString = searchParams.toString()
      ? `?${searchParams.toString()}`
      : "";

    const headers = new Headers();
    const apiKey = process.env.LANGCHAIN_API_KEY?.trim();
    if (apiKey) headers.set("x-api-key", apiKey);

    const accept = req.headers.get("accept");
    if (accept) headers.set("accept", accept);

    const contentType = req.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);

    const options: RequestInit = {
      method,
      headers,
      redirect: "manual",
      signal: req.signal,
    };

    if (["POST", "PUT", "PATCH"].includes(method)) {
      options.body = await req.text();
    }

    const res = await fetch(`${apiUrl}/${path}${queryString}`, options);

    if (
      res.status === 0 ||
      (res.status >= 300 && res.status < 400 && res.status !== 304) ||
      res.type === "opaqueredirect"
    ) {
      await res.body?.cancel().catch(() => undefined);
      return NextResponse.json(
        { error: "LangGraph returned an unexpected redirect." },
        { status: 502 },
      );
    }

    const responseHeaders = new Headers(res.headers);
    for (const name of [
      "access-control-allow-credentials",
      "access-control-allow-headers",
      "access-control-allow-methods",
      "access-control-allow-origin",
      "content-encoding",
      "content-length",
      "set-cookie",
      "transfer-encoding",
    ]) {
      responseHeaders.delete(name);
    }
    responseHeaders.set("Cache-Control", "no-store");

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (e: unknown) {
    if (e instanceof Error) {
      const typedError = e as Error & { status?: number };
      return NextResponse.json(
        { error: typedError.message },
        { status: typedError.status ?? 500 },
      );
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}

export const GET = (req: NextRequest) => handleRequest(req, "GET");
export const POST = (req: NextRequest) => handleRequest(req, "POST");
export const PUT = (req: NextRequest) => handleRequest(req, "PUT");
export const PATCH = (req: NextRequest) => handleRequest(req, "PATCH");
export const DELETE = (req: NextRequest) => handleRequest(req, "DELETE");
export const OPTIONS = (req: NextRequest) => {
  const originError = originErrorResponse(req);
  if (originError) return originError;
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: ALLOWED_METHODS },
  });
};
