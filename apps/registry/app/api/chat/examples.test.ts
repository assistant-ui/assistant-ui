import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The example toolkits render React components; the routes only need an
// empty toolkit to build their tool lists.
vi.mock("../../../../../examples/with-artifacts/app/toolkit", () => ({
  default: {},
}));
vi.mock("../../../../../examples/with-chain-of-thought/app/toolkit", () => ({
  default: {},
}));
vi.mock("../../../../../examples/with-generative-ui/app/toolkit", () => ({
  default: {},
}));
vi.mock("../../../../../examples/with-webmcp/app/toolkit", () => ({
  default: {},
}));
vi.mock("@/lib/resumable-context", () => ({
  getResumableStreamContext: async () => ({
    run: async (_id: string, create: () => ReadableStream<Uint8Array>) =>
      create(),
  }),
}));

// Every example calls its model over fetch, so a fetch call is a model call.
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("GOOGLE_GENAI_API_KEY", "test-key");
  fetchMock.mockImplementation(async () =>
    Response.json({ error: { message: "test model" } }, { status: 400 }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

const chatBody = {
  messages: [
    { id: "user-1", role: "user", parts: [{ type: "text", text: "Hello" }] },
  ],
  tools: {},
};

const loadPOST = (path: string) => async () => {
  const route = await import(
    new URL(`../../../../../${path}`, import.meta.url).href
  );
  const POST: (request: Request) => Promise<Response> = route.POST;
  return POST;
};

const examples = [
  "with-ai-sdk-v7",
  "with-artifacts",
  "with-chain-of-thought",
  "with-cloud",
  "with-custom-thread-list",
  "with-elevenlabs-conversational",
  "with-elevenlabs-scribe",
  "with-ffmpeg",
  "with-generative-ui",
  "with-google-adk",
  "with-interactables",
  "with-livekit",
  "with-openui",
  "with-react-hook-form",
  "with-resumable-stream",
  "with-webmcp",
].map((name) => ({
  name,
  body:
    name === "with-google-adk"
      ? { message: "Hello", sessionId: "session-1" }
      : chatBody,
  load: loadPOST(`examples/${name}/app/api/chat/route.ts`),
}));

// Nuxt apps run on h3 with Nitro auto-imports, so the test provides the same
// globals from the h3 version Nuxt's server installs.
const loadNuxtRoute = (app: string) => async () => {
  const resolveFrom = (from: string, id: string) =>
    createRequire(from).resolve(id);
  const nuxt = resolveFrom(
    fileURLToPath(
      new URL(`../../../../../${app}/package.json`, import.meta.url),
    ),
    "nuxt/package.json",
  );
  const nitroServer = resolveFrom(nuxt, "@nuxt/nitro-server/package.json");
  const h3 = await import(resolveFrom(nitroServer, "h3"));
  for (const name of [
    "defineEventHandler",
    "getRequestHeader",
    "getRequestURL",
    "readBody",
  ]) {
    vi.stubGlobal(name, h3[name]);
  }
  const nuxtFile = (path: string) =>
    new URL(`../../../../../${app}/server/${path}`, import.meta.url).href;
  const { isAllowedRequestContext } = await import(
    nuxtFile("utils/request-context.ts")
  );
  vi.stubGlobal("isAllowedRequestContext", isAllowedRequestContext);

  const { default: handler } = await import(nuxtFile("api/chat.post.ts"));
  const POST: (request: Request) => Promise<Response> = h3.toWebHandler(
    h3.createApp().use("/api/chat", handler),
  );
  return POST;
};

const loadReactRouterRoute = async () => {
  const route = await import(
    new URL(
      "../../../../../examples/with-react-router/app/routes/api.chat.ts",
      import.meta.url,
    ).href
  );
  const action: (args: { request: Request }) => Promise<Response> =
    route.action;
  return async (request: Request) => {
    const response = await action({ request });
    const streamedText = await response.text().catch(() => "");
    return new Response(streamedText, response);
  };
};

const routes = [
  ...examples,
  {
    name: "with-expo",
    body: chatBody,
    load: loadPOST("examples/with-expo/app/api/chat+api.ts"),
  },
  {
    name: "with-mcp",
    body: chatBody,
    load: loadPOST("examples/with-mcp/app/app/api/chat/route.ts"),
  },
  {
    name: "with-nuxt",
    body: chatBody,
    load: loadNuxtRoute("examples/with-nuxt"),
  },
  { name: "with-react-router", body: chatBody, load: loadReactRouterRoute },
  {
    name: "nuxt template",
    body: chatBody,
    load: loadNuxtRoute("templates/nuxt"),
  },
];

describe.each(routes)("$name chat route request context", ({ body, load }) => {
  const request = (headers: Record<string, string>) =>
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  const unparsableRequest = (headers: Record<string, string>) =>
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "text/plain", ...headers },
      body: "not json",
    });

  it.each([
    ["a cross-site fetch", { "sec-fetch-site": "cross-site" }],
    ["a same-site fetch", { "sec-fetch-site": "same-site" }],
    ["a foreign Origin", { origin: "https://example.net" }],
  ])("rejects %s before reading the body", async (_label, headers) => {
    const POST = await load();
    const response = await POST(unparsableRequest(headers));
    await response.text();

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a same-origin fetch", { "sec-fetch-site": "same-origin" }],
    ["its own Origin", { origin: "http://localhost" }],
    ["a request without browser headers", {}],
  ])("serves %s", async (_label, headers) => {
    const POST = await load();
    const response = await POST(request(headers));
    await response.text();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalled();
  });
});
