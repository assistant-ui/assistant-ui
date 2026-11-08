/// <reference types="node" />

import { once } from "node:events";
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A2AClient } from "./A2AClient";

const headerSets = [
  {
    name: "canonical",
    names: ["Content-Type", "A2A-Version", "Accept", "A2A-Extensions"],
  },
  {
    name: "lowercase",
    names: ["content-type", "a2a-version", "accept", "a2a-extensions"],
  },
  {
    name: "mixed",
    names: ["CoNtEnT-TyPe", "a2A-vErSiOn", "aCcEpT", "a2a-eXtEnSiOnS"],
  },
].map(({ name, names }) => ({
  name,
  headers: {
    ...Object.fromEntries(
      names.map((key, index) => [
        key,
        ["application/a2a+json", "1.0", "application/json", "urn:custom"][
          index
        ]!,
      ]),
    ),
    Authorization: "Bearer local",
    "X-Custom": "kept",
  },
}));
const cases = headerSets.flatMap(({ name, headers }) =>
  [false, true].flatMap((dynamic) =>
    [false, true].map((streaming) => ({ name, headers, dynamic, streaming })),
  ),
);

describe("A2AClient protocol header casing over HTTP", () => {
  let server: Server;
  let baseUrl: string;
  let received: IncomingHttpHeaders | undefined;

  beforeAll(async () => {
    server = createServer((request, response) => {
      received = request.headers;
      const payload = JSON.stringify({
        task: {
          id: "task-1",
          contextId: "ctx-1",
          status: { state: "TASK_STATE_COMPLETED" },
        },
      });
      const streaming = request.url === "/message:stream";
      response.writeHead(200, {
        "content-type": streaming
          ? "text/event-stream"
          : "application/a2a+json",
      });
      response.end(streaming ? `data: ${payload}\n\n` : payload);
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (address === null || typeof address === "string")
      throw new Error("Missing HTTP port");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it.each(cases)(
    "merges $name headers (dynamic=$dynamic, streaming=$streaming)",
    async ({ headers, dynamic, streaming }) => {
      const original = { ...headers };
      const client = new A2AClient({
        baseUrl,
        headers: dynamic ? async () => headers : headers,
        extensions: ["urn:configured"],
      });
      const message = {
        messageId: "m1",
        role: "user" as const,
        parts: [{ text: "hello" }],
      };
      if (streaming) {
        const events = [];
        for await (const event of client.streamMessage(message))
          events.push(event);
        expect(events).toEqual([
          {
            type: "task",
            task: {
              id: "task-1",
              contextId: "ctx-1",
              status: { state: "completed" },
            },
          },
        ]);
      } else {
        await expect(client.sendMessage(message)).resolves.toEqual({
          id: "task-1",
          contextId: "ctx-1",
          status: { state: "completed" },
        });
      }
      expect(received).toMatchObject({
        "content-type": "application/a2a+json",
        "a2a-version": "1.0",
        accept: streaming ? "text/event-stream" : "application/json",
        "a2a-extensions": "urn:configured",
        authorization: "Bearer local",
        "x-custom": "kept",
      });
      expect(headers).toEqual(original);
    },
  );
});
