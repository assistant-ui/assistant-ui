import assert from "node:assert/strict";
import test from "node:test";
import { createGitHubClient } from "./review-github-client.mjs";

test("the GitHub client sends authenticated JSON, follows Link pages, and accepts empty responses", async () => {
  const calls = [];
  const responses = [
    new Response(JSON.stringify([{ id: 1 }]), {
      headers: {
        link: '<https://api.test/items?page=2>; rel="next", <https://api.test/items?page=2>; rel="last"',
      },
    }),
    new Response(JSON.stringify([{ id: 2 }]), {
      headers: { link: '<https://api.test/items>; rel="prev"' },
    }),
    new Response(null, { status: 204 }),
    new Response(JSON.stringify({ id: 3 }), {
      status: 201,
      headers: { "x-test": "present" },
    }),
  ];
  const client = createGitHubClient({
    token: "test-token",
    apiRoot: "https://api.test/",
    fetch: async (url, options) => {
      calls.push({ url, options });
      return responses.shift();
    },
  });
  assert.deepEqual(await client.paginate("/items"), [{ id: 1 }, { id: 2 }]);
  assert.equal((await client.rest("DELETE", "/item/1")).data, null);
  const response = await client.rest("POST", "/items", { name: "new" });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("x-test"), "present");
  assert.deepEqual(response.data, { id: 3 });
  assert.deepEqual(
    calls.map(({ url }) => url),
    [
      "https://api.test/items",
      "https://api.test/items?page=2",
      "https://api.test/item/1",
      "https://api.test/items",
    ],
  );
  assert.equal(calls[0].options.headers.Authorization, "Bearer test-token");
  assert.equal(calls[0].options.headers.Accept, "application/vnd.github+json");
  assert.equal(calls[0].options.headers["X-GitHub-Api-Version"], "2022-11-28");
  assert.equal(calls[3].options.headers["Content-Type"], "application/json");
  assert.equal(calls[3].options.body, JSON.stringify({ name: "new" }));
});

test("the GitHub client returns raw text, handles only raw 404 as missing, and unwraps GraphQL", async () => {
  const calls = [];
  const responses = [
    new Response("export const value = 1;"),
    new Response("", { status: 404 }),
    new Response("Denied", { status: 403 }),
    new Response(JSON.stringify({ data: { repository: { name: "example" } } })),
    new Response(
      JSON.stringify({
        errors: [
          { message: "First error", type: "NOT_FOUND" },
          { message: "Second error", type: "FORBIDDEN" },
        ],
      }),
    ),
  ];
  const client = createGitHubClient({
    token: "token",
    fetch: async (url, options) => {
      calls.push({ url, options });
      return responses.shift();
    },
  });
  assert.equal(await client.raw("/contents/source"), "export const value = 1;");
  assert.equal(calls[0].options.headers.Accept, "application/vnd.github.raw");
  assert.equal(await client.raw("/contents/missing"), null);
  await assert.rejects(client.raw("/contents/denied"), { status: 403 });
  assert.deepEqual(await client.graphql("query Example", { n: 12 }), {
    repository: { name: "example" },
  });
  assert.equal(calls[3].url, "https://api.github.com/graphql");
  assert.deepEqual(JSON.parse(calls[3].options.body), {
    query: "query Example",
    variables: { n: 12 },
  });
  await assert.rejects(client.graphql("query Broken", {}), {
    status: 200,
    message: "First error; Second error",
    types: ["NOT_FOUND", "FORBIDDEN"],
  });
});

test("HTTP, transport, and invalid JSON failures carry a status", async () => {
  const client = createGitHubClient({
    token: "token",
    fetch: async () => new Response("Missing", { status: 404 }),
  });
  await assert.rejects(client.rest("GET", "/missing"), { status: 404 });
  const offline = createGitHubClient({
    token: "token",
    wait: async () => {},
    fetch: async () => {
      throw new Error("Offline");
    },
  });
  await assert.rejects(offline.rest("GET", "/items"), {
    status: 0,
    message: "Offline",
  });
  const invalid = createGitHubClient({
    token: "token",
    fetch: async () => new Response("not json"),
  });
  await assert.rejects(invalid.rest("GET", "/items"), { status: 200 });
});

test("the GitHub client retries transient failures on reads but never on writes", async () => {
  const requests = [];
  const waits = [];
  const responses = [
    new Response("Bad gateway", { status: 502 }),
    new Response(
      new ReadableStream({
        start(controller) {
          controller.error(new Error("Connection reset"));
        },
      }),
    ),
    new Response(JSON.stringify([{ id: 1 }])),
    new Response("Gateway timeout", { status: 504 }),
    new Response(JSON.stringify({ data: { viewer: { login: "octo" } } })),
    new Response("Bad gateway", { status: 502 }),
  ];
  const client = createGitHubClient({
    token: "token",
    wait: async (ms) => {
      waits.push(ms);
    },
    fetch: async (url, options) => {
      requests.push(`${options.method} ${url}`);
      return responses.shift();
    },
  });
  assert.deepEqual((await client.rest("GET", "/items")).data, [{ id: 1 }]);
  assert.deepEqual(await client.graphql("query Viewer", {}), {
    viewer: { login: "octo" },
  });
  await assert.rejects(client.rest("POST", "/items", { name: "new" }), {
    status: 502,
  });
  assert.deepEqual(requests, [
    "GET https://api.github.com/items",
    "GET https://api.github.com/items",
    "GET https://api.github.com/items",
    "POST https://api.github.com/graphql",
    "POST https://api.github.com/graphql",
    "POST https://api.github.com/items",
  ]);
  assert.deepEqual(waits, [1000, 2000, 1000]);
});

test("the GitHub client stops after three attempts and leaves other statuses alone", async () => {
  const waits = [];
  let unavailable = 0;
  const failing = createGitHubClient({
    token: "token",
    wait: async (ms) => {
      waits.push(ms);
    },
    fetch: async () => {
      unavailable++;
      return new Response("Unavailable", { status: 503 });
    },
  });
  await assert.rejects(failing.rest("GET", "/items"), { status: 503 });
  assert.equal(unavailable, 3);
  assert.deepEqual(waits, [1000, 2000]);
  let missing = 0;
  const notFound = createGitHubClient({
    token: "token",
    wait: async () => {},
    fetch: async () => {
      missing++;
      return new Response("Missing", { status: 404 });
    },
  });
  await assert.rejects(notFound.rest("GET", "/missing"), { status: 404 });
  assert.equal(missing, 1);
});
