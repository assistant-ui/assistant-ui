import { type NextRequest, NextResponse } from "next/server";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyAgentRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyAgentRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyAgentRequest(request, context);
}

async function proxyAgentRequest(request: NextRequest, context: RouteContext) {
  const backendUrl = process.env.AGENT_BACKEND_URL?.replace(/\/$/, "");
  if (!backendUrl) {
    return NextResponse.json({ error: "AGENT_BACKEND_URL is not configured." }, { status: 500 });
  }

  const { path = [] } = await context.params;
  const upstream = new URL(`/api/${path.map(encodeURIComponent).join("/")}`, backendUrl);
  upstream.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  for (const header of HOP_BY_HOP_HEADERS) headers.delete(header);
  headers.delete("host");

  const response = await fetch(upstream, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    // Required when forwarding a streaming request body through fetch.
    duplex: "half",
    cache: "no-store",
  } as RequestInit & { duplex: "half" });

  const responseHeaders = new Headers(response.headers);
  for (const header of HOP_BY_HOP_HEADERS) responseHeaders.delete(header);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
