export const runtime = "edge";

// This route forwards the browser's LangGraph calls with the server's
// LANGCHAIN_API_KEY, so every thread on the deployment is reachable through
// it. It only allows the calls the chat UI makes and only from this app's own
// pages. It is not authentication. Before you deploy, require your app session
// here and scope threads to the signed-in user:
// - On `POST threads`, set `metadata.owner` to the user id on the server,
//   replacing whatever the client sent.
// - For every `threads/<id>/...` path, read the thread with the API key and
//   forward only when `metadata.owner` matches the user.

function isAllowedPath(path: string, method: string) {
  const thread = "[a-zA-Z0-9_-]+";
  if (method === "GET")
    return new RegExp(`^threads/${thread}/state$`).test(path);
  if (method !== "POST") return false;
  return (
    path === "threads" ||
    new RegExp(
      `^threads/${thread}/(?:commands|stream/events|history|runs/stream|runs/${thread}/cancel)$`,
    ).test(path)
  );
}

// Browsers send Sec-Fetch-Site on every fetch. Requests without it (curl,
// server-to-server clients, very old browsers) are refused.
function isAllowedRequestContext(req: Request) {
  return req.headers.get("sec-fetch-site") === "same-origin";
}

function crossOriginResponse() {
  return Response.json(
    { error: "Only same-origin browser requests are allowed." },
    { status: 403 },
  );
}

const notFound = () => new Response(null, { status: 404 });

async function handleRequest(req: Request, method: string) {
  if (!isAllowedRequestContext(req)) return crossOriginResponse();

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/?api\//, "");
    if (!isAllowedPath(path, method)) return notFound();

    const apiUrl = process.env.LANGGRAPH_API_URL?.trim();
    if (!apiUrl) {
      return Response.json(
        { error: "LANGGRAPH_API_URL is not configured." },
        { status: 503 },
      );
    }

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

    if (method === "POST") {
      options.body = await req.text();
    }

    const res = await fetch(`${apiUrl}/${path}${queryString}`, options);

    if (
      res.status === 0 ||
      (res.status >= 300 && res.status < 400 && res.status !== 304) ||
      res.type === "opaqueredirect"
    ) {
      await res.body?.cancel().catch(() => undefined);
      return Response.json(
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

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (e: unknown) {
    console.error("LangGraph proxy request failed", e);
    return Response.json({ error: "Proxy request failed." }, { status: 502 });
  }
}

export const GET = (req: Request) => handleRequest(req, "GET");
export const HEAD = notFound;
export const POST = (req: Request) => handleRequest(req, "POST");
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const OPTIONS = (req: Request) =>
  isAllowedRequestContext(req) ? notFound() : crossOriginResponse();
