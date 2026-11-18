import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

/** @type {import("vite").ViteDevServer} */
let server;
/** @type {(event: { request: Request }) => Promise<Response>} */
let post;

before(async () => {
  server = await createServer({
    appType: "custom",
    logLevel: "error",
    plugins: [
      {
        name: "chat-route-test-mocks",
        enforce: "pre",
        resolveId(source) {
          if (source === "@ai-sdk/openai") return "\0chat-route-openai";
          if (source === "ai") return "\0chat-route-ai";
        },
        load(id) {
          if (id === "\0chat-route-openai") {
            return "export const createOpenAI = () => (model) => model;";
          }
          if (id === "\0chat-route-ai") {
            return [
              "export const convertToModelMessages = async (messages) => messages;",
              "export const streamText = () => ({ toUIMessageStreamResponse: () => new Response('stream') });",
            ].join("\n");
          }
        },
      },
    ],
    server: { middlewareMode: true },
    ssr: { noExternal: ["@ai-sdk/openai", "ai"] },
  });
  const module = await server.ssrLoadModule("/src/routes/api/chat/+server.ts");
  post = /** @type {typeof post} */ (module.POST);
});

after(async () => {
  await server?.close();
});

/** @param {Record<string, string>} headers @param {string} [body] */
function chatRequest(headers, body = JSON.stringify({ messages: [] })) {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "content-type": "text/plain", ...headers },
    body,
  });
}

test("rejects a cross-site POST before parsing its body", async () => {
  const response = await post({
    request: chatRequest(
      {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      },
      "not-json",
    ),
  });

  assert.equal(response.status, 403);
});

test("rejects a cross-site simple POST with valid JSON", async () => {
  const response = await post({
    request: chatRequest({
      origin: "https://attacker.example",
      "sec-fetch-site": "cross-site",
    }),
  });

  assert.equal(response.status, 403);
});

test("rejects a same-site POST from a sibling origin", async () => {
  const response = await post({
    request: chatRequest({
      origin: "http://sibling.localhost:3000",
      "sec-fetch-site": "same-site",
    }),
  });

  assert.equal(response.status, 403);
});

test("rejects a foreign Origin when Fetch Metadata is unavailable", async () => {
  const response = await post({
    request: chatRequest({ origin: "https://attacker.example" }),
  });

  assert.equal(response.status, 403);
});

test("accepts a request from the route's own origin", async () => {
  const response = await post({
    request: chatRequest({ origin: "http://localhost:3000" }),
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "stream");
});
