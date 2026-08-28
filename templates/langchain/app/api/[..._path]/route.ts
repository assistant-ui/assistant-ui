import { NextResponse } from "next/server";

export const runtime = "edge";

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

function isSameOriginRequest(req: Request) {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = req.headers.get("origin");
  return origin === null || origin === new URL(req.url).origin;
}

function crossOriginResponse() {
  return NextResponse.json(
    { error: "Cross-origin requests are not allowed." },
    { status: 403 },
  );
}

export async function handleRequest(req: Request, method: string) {
  if (!isSameOriginRequest(req)) return crossOriginResponse();

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/?api\//, "");
    const searchParams = new URLSearchParams(url.search);
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

    const apiUrl = process.env.LANGGRAPH_API_URL?.trim();
    if (!apiUrl) {
      return NextResponse.json(
        { error: "LANGGRAPH_API_URL is not configured." },
        { status: 503 },
      );
    }

    const res = await fetch(`${apiUrl}/${path}${queryString}`, options);

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

export const GET = (req: Request) => handleRequest(req, "GET");
export const POST = (req: Request) => handleRequest(req, "POST");
export const PUT = (req: Request) => handleRequest(req, "PUT");
export const PATCH = (req: Request) => handleRequest(req, "PATCH");
export const DELETE = (req: Request) => handleRequest(req, "DELETE");
export const OPTIONS = (req: Request) =>
  isSameOriginRequest(req)
    ? new NextResponse(null, {
        status: 204,
        headers: { Allow: ALLOWED_METHODS },
      })
    : crossOriginResponse();
