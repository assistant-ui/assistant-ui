import assert from "node:assert/strict";
import { test } from "node:test";
import { createPreviewTransport } from "./transport.ts";

test("stopping after the final text chunk never emits a successful finish", async () => {
  const controller = new AbortController();
  const transport = createPreviewTransport(() => "Hello");
  const stream = await transport.sendMessages({
    messages: [
      { id: "user", role: "user", parts: [{ type: "text", text: "Hi" }] },
    ],
    abortSignal: controller.signal,
  });
  const reader = stream.getReader();
  assert.equal((await reader.read()).value.type, "start");
  assert.equal((await reader.read()).value.type, "text-start");
  assert.equal((await reader.read()).value.type, "text-delta");
  controller.abort();
  await assert.rejects(reader.read(), { name: "AbortError" });
});
