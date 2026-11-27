import assert from "node:assert/strict";
import { test } from "node:test";
import { decide, startMockLLM } from "./mock-llm.ts";

const user = (text: string, images = 0) => ({
  role: "user" as const,
  text,
  images,
});

test("decide echoes, calls offered tools, and fails a flaky message once", () => {
  const seen = new Set<string>();
  assert.deepEqual(decide({ messages: [user("hi")], tools: [] }, seen), {
    kind: "text",
    text: "Echo: hi",
  });
  assert.deepEqual(
    decide({ messages: [user("weather?")], tools: ["get_weather"] }, seen),
    { kind: "tool", name: "get_weather", args: { city: "Paris" } },
  );
  // A tool the app didn't offer is never called.
  assert.equal(
    decide({ messages: [user("weather?")], tools: [] }, seen).kind,
    "text",
  );
  assert.equal(
    decide({ messages: [user("so flaky")], tools: [] }, seen).kind,
    "error",
  );
  assert.equal(
    decide({ messages: [user("so flaky")], tools: [] }, seen).kind,
    "text",
  );
  assert.deepEqual(decide({ messages: [user("look", 2)], tools: [] }, seen), {
    kind: "text",
    text: "I received 2 image(s). Echo: look",
  });
});

test("serves Chat Completions and Responses streams and records what the app sent", async () => {
  const mock = await startMockLLM();
  try {
    const chat = await fetch(`${mock.url}/v1/chat/completions`, {
      method: "POST",
      body: JSON.stringify({
        model: "mock-smart",
        stream: true,
        messages: [
          { role: "system", content: "The user's name is Ada." },
          { role: "user", content: [{ type: "text", text: "Hello" }] },
        ],
      }),
    }).then((r) => r.text());
    const text = [...chat.matchAll(/"content":"([^"]*)"/g)]
      .map((m) => m[1])
      .join("");
    assert.equal(text, "Echo: Hello");

    const responses = await fetch(`${mock.url}/v1/responses`, {
      method: "POST",
      body: JSON.stringify({
        model: "mock-1",
        stream: true,
        input: [
          { role: "user", content: [{ type: "input_text", text: "weather?" }] },
        ],
        tools: [{ type: "function", name: "get_weather" }],
      }),
    }).then((r) => r.text());
    assert.match(responses, /"type":"function_call".*"name":"get_weather"/);

    const [first, second] = mock.requests;
    assert.equal(first?.model, "mock-smart");
    assert.equal(first?.system, "The user's name is Ada.");
    assert.equal(second?.api, "responses");
    assert.deepEqual(second?.tools, ["get_weather"]);
  } finally {
    await mock.close();
  }
});

test("the legacy endpoint streams SSE and needs the whole conversation", async () => {
  const mock = await startMockLLM();
  try {
    const bad = await fetch(`${mock.url}/legacy/chat`, {
      method: "POST",
      body: JSON.stringify({ message: "hi" }),
    });
    assert.equal(bad.status, 400);
    const body = await fetch(`${mock.url}/legacy/chat`, {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "ping" }] }),
    }).then((r) => r.text());
    const text = [...body.matchAll(/"text":"([^"]*)"/g)]
      .map((m) => m[1])
      .join("");
    assert.equal(text, "Legacy says: ping");
    assert.match(body, /data: \[DONE\]/);
  } finally {
    await mock.close();
  }
});
