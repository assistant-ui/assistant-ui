import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { A2AClient, A2AError } from "./A2AClient";
import type { A2AMessage, A2AStreamEvent } from "./types";

// --- Fetch mock helpers ---

function mockFetchResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers(),
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function mockSSEResponse(lines: string[]): Response {
  const text = lines.join("\n");
  const encoder = new TextEncoder();
  const chunks = [encoder.encode(text)];
  let index = 0;

  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "text/event-stream" }),
    body: {
      getReader: () => ({
        read: vi.fn().mockImplementation(() => {
          if (index < chunks.length) {
            return Promise.resolve({
              done: false,
              value: chunks[index++],
            });
          }
          return Promise.resolve({ done: true, value: undefined });
        }),
        releaseLock: vi.fn(),
      }),
    },
  } as unknown as Response;
}

const userMessage: A2AMessage = {
  messageId: "msg-1",
  role: "user",
  parts: [{ text: "Hello" }],
};

describe("A2AClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: A2AClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    client = new A2AClient({ baseUrl: "https://agent.test" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // --- Headers ---

  describe("headers", () => {
    it("sends A2A-Version header", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          task: { id: "t1", status: { state: "completed" } },
        }),
      );

      await client.sendMessage(userMessage);

      const [, init] = fetchMock.mock.calls[0]!;
      expect(init.headers["A2A-Version"]).toBe("1.0");
    });

    it("sends application/a2a+json content type for POST", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          task: { id: "t1", status: { state: "completed" } },
        }),
      );

      await client.sendMessage(userMessage);

      const [, init] = fetchMock.mock.calls[0]!;
      expect(init.headers["Content-Type"]).toBe("application/a2a+json");
    });

    it("does not send Content-Type for GET requests", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          name: "Test",
          description: "desc",
          version: "1.0",
          supportedInterfaces: [],
          capabilities: {},
          defaultInputModes: [],
          defaultOutputModes: [],
          skills: [],
        }),
      );

      await client.getAgentCard();

      const [, init] = fetchMock.mock.calls[0]!;
      expect(init.headers["Content-Type"]).toBeUndefined();
    });

    it("sends A2A-Extensions header when extensions configured", async () => {
      const extClient = new A2AClient({
        baseUrl: "https://agent.test",
        extensions: ["urn:ext:one", "urn:ext:two"],
      });

      fetchMock.mockResolvedValue(
        mockFetchResponse({
          task: { id: "t1", status: { state: "completed" } },
        }),
      );

      await extClient.sendMessage(userMessage);

      const [, init] = fetchMock.mock.calls[0]!;
      expect(init.headers["A2A-Extensions"]).toBe("urn:ext:one, urn:ext:two");
    });

    it("supports dynamic headers via function", async () => {
      const dynamicClient = new A2AClient({
        baseUrl: "https://agent.test",
        headers: () => ({ Authorization: "Bearer tok123" }),
      });

      fetchMock.mockResolvedValue(
        mockFetchResponse({
          task: { id: "t1", status: { state: "completed" } },
        }),
      );

      await dynamicClient.sendMessage(userMessage);

      const [, init] = fetchMock.mock.calls[0]!;
      expect(init.headers["Authorization"]).toBe("Bearer tok123");
    });
  });

  // --- Tenant ---

  describe("tenant", () => {
    it("prepends tenant to URL path", async () => {
      const tenantClient = new A2AClient({
        baseUrl: "https://agent.test",
        tenant: "my-org",
      });

      fetchMock.mockResolvedValue(
        mockFetchResponse({
          task: { id: "t1", status: { state: "completed" } },
        }),
      );

      await tenantClient.sendMessage(userMessage);

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toBe("https://agent.test/my-org/message:send");
    });
  });

  // --- sendMessage ---

  describe("sendMessage", () => {
    it("sends POST to /message:send with wire-format role", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          task: { id: "t1", status: { state: "completed" } },
        }),
      );

      await client.sendMessage(userMessage);

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe("https://agent.test/message:send");
      expect(init.method).toBe("POST");

      const body = JSON.parse(init.body);
      expect(body.message.role).toBe("ROLE_USER");
      expect(body.message.messageId).toBe("msg-1");
    });

    it("unwraps task from SendMessageResponse", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          task: {
            id: "t1",
            status: { state: "TASK_STATE_COMPLETED" },
          },
        }),
      );

      const result = await client.sendMessage(userMessage);
      expect((result as any).id).toBe("t1");
      expect((result as any).status.state).toBe("completed");
    });

    it("unwraps message from SendMessageResponse", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          message: {
            messageId: "m2",
            role: "ROLE_AGENT",
            parts: [{ text: "Hi" }],
          },
        }),
      );

      const result = await client.sendMessage(userMessage);
      expect((result as any).messageId).toBe("m2");
      expect((result as any).role).toBe("agent");
    });

    it("includes metadata in request body", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          task: { id: "t1", status: { state: "completed" } },
        }),
      );

      await client.sendMessage(userMessage, undefined, { foo: "bar" });

      const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
      expect(body.metadata).toEqual({ foo: "bar" });
    });
  });

  // --- Enum normalization ---

  describe("enum normalization", () => {
    it("normalizes TASK_STATE_* to lowercase", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          task: {
            id: "t1",
            status: { state: "TASK_STATE_WORKING" },
          },
        }),
      );

      const result = (await client.sendMessage(userMessage)) as any;
      expect(result.id).toBe("t1");
      expect(result.status.state).toBe("working");
    });

    it("normalizes ROLE_AGENT to lowercase", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          message: {
            messageId: "m1",
            role: "ROLE_AGENT",
            parts: [{ text: "Hi" }],
          },
        }),
      );

      const result = (await client.sendMessage(userMessage)) as any;
      expect(result.role).toBe("agent");
    });

    it("passes through already-lowercase values", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          task: { id: "t1", status: { state: "working" } },
        }),
      );

      const result = (await client.sendMessage(userMessage)) as any;
      expect(result.status.state).toBe("working");
    });

    it("normalizes snake_case keys to camelCase", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          task: {
            id: "t1",
            context_id: "ctx-1",
            status: { state: "completed" },
          },
        }),
      );

      const result = (await client.sendMessage(userMessage)) as any;
      expect(result.contextId).toBe("ctx-1");
    });

    it("preserves metadata keys without camelCase conversion", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          task: {
            id: "t1",
            status: { state: "completed" },
            metadata: {
              my_custom_key: "value1",
              another_snake_key: { nested_key: 42 },
            },
          },
        }),
      );

      const result = (await client.sendMessage(userMessage)) as any;
      // metadata keys should NOT be camelCased
      expect(result.metadata.my_custom_key).toBe("value1");
      expect(result.metadata.another_snake_key.nested_key).toBe(42);
      expect(result.metadata.myCustomKey).toBeUndefined();
    });

    it("does not normalize enum-like values inside metadata", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          task: {
            id: "t1",
            status: { state: "completed" },
            metadata: {
              state: "TASK_STATE_WORKING",
              role: "ROLE_AGENT",
            },
          },
        }),
      );

      const result = (await client.sendMessage(userMessage)) as any;
      // metadata values should NOT be enum-normalized
      expect(result.metadata.state).toBe("TASK_STATE_WORKING");
      expect(result.metadata.role).toBe("ROLE_AGENT");
    });

    it("preserves data field values in parts", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          message: {
            message_id: "m1",
            role: "ROLE_AGENT",
            parts: [
              {
                data: {
                  snake_case_key: "preserved",
                  state: "TASK_STATE_SHOULD_NOT_CHANGE",
                },
              },
            ],
          },
        }),
      );

      const result = (await client.sendMessage(userMessage)) as any;
      const data = result.parts[0].data;
      expect(data.snake_case_key).toBe("preserved");
      expect(data.state).toBe("TASK_STATE_SHOULD_NOT_CHANGE");
    });
  });

  // --- Error handling ---

  describe("error handling", () => {
    it("throws A2AError with structured error body", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({
          error: {
            code: 404,
            status: "NOT_FOUND",
            message: "Task not found",
            details: [{ reason: "TASK_NOT_FOUND" }],
          },
        }),
      });

      await expect(client.getTask("missing")).rejects.toThrow(A2AError);

      try {
        await client.getTask("missing");
      } catch (e) {
        const err = e as A2AError;
        expect(err.code).toBe(404);
        expect(err.status).toBe("NOT_FOUND");
        expect(err.message).toBe("Task not found");
        expect(err.details).toEqual([{ reason: "TASK_NOT_FOUND" }]);
      }
    });

    it("throws A2AError with generic error when no body", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: new Headers(),
        json: vi.fn().mockRejectedValue(new Error("no body")),
      });

      await expect(client.getTask("t1")).rejects.toThrow(A2AError);
    });
  });

  // --- getTask ---

  describe("getTask", () => {
    it("sends GET to /tasks/{id}", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({ id: "t1", status: { state: "completed" } }),
      );

      await client.getTask("t1");

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toBe("https://agent.test/tasks/t1");
    });

    it("includes history_length query param", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({ id: "t1", status: { state: "completed" } }),
      );

      await client.getTask("t1", 5);

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toBe("https://agent.test/tasks/t1?history_length=5");
    });
  });

  // --- listTasks ---

  describe("listTasks", () => {
    it("sends GET to /tasks with query params", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          tasks: [],
          nextPageToken: "",
          pageSize: 50,
          totalSize: 0,
        }),
      );

      await client.listTasks({
        contextId: "ctx-1",
        status: "working",
        pageSize: 10,
      });

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toContain("/tasks?");
      expect(url).toContain("context_id=ctx-1");
      expect(url).toContain("status=TASK_STATE_WORKING");
      expect(url).toContain("page_size=10");
    });
  });

  // --- cancelTask ---

  describe("cancelTask", () => {
    it("sends POST to /tasks/{id}:cancel", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({ id: "t1", status: { state: "canceled" } }),
      );

      await client.cancelTask("t1");

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe("https://agent.test/tasks/t1:cancel");
      expect(init.method).toBe("POST");
    });

    it("includes metadata in cancel request", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({ id: "t1", status: { state: "canceled" } }),
      );

      await client.cancelTask("t1", { reason: "user requested" });

      const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
      expect(body.metadata).toEqual({ reason: "user requested" });
    });
  });

  // --- getAgentCard ---

  describe("getAgentCard", () => {
    it("fetches from /.well-known/agent-card.json", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          name: "Test Agent",
          description: "A test",
          version: "1.0",
          supported_interfaces: [
            {
              url: "https://agent.test",
              protocol_binding: "HTTP+JSON",
              protocol_version: "1.0",
            },
          ],
          capabilities: { streaming: true },
          default_input_modes: ["text"],
          default_output_modes: ["text"],
          skills: [],
        }),
      );

      const card = await client.getAgentCard();

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toBe("https://agent.test/.well-known/agent-card.json");
      expect(card.name).toBe("Test Agent");
      expect(card.capabilities.streaming).toBe(true);
      // snake_case keys should be normalized
      expect(card.supportedInterfaces).toHaveLength(1);
      expect(card.supportedInterfaces[0]!.protocolBinding).toBe("HTTP+JSON");
    });
  });

  // --- SSE streaming ---

  describe("streamMessage", () => {
    it("parses SSE status update events", async () => {
      const sseData = JSON.stringify({
        status_update: {
          task_id: "t1",
          context_id: "ctx-1",
          status: {
            state: "TASK_STATE_WORKING",
            message: {
              message_id: "s1",
              role: "ROLE_AGENT",
              parts: [{ text: "Thinking..." }],
            },
          },
        },
      });

      fetchMock.mockResolvedValue(
        mockSSEResponse([`data: ${sseData}`, "", ""]),
      );

      const events: A2AStreamEvent[] = [];
      for await (const event of client.streamMessage(userMessage)) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe("statusUpdate");
      const evt = events[0] as Extract<
        A2AStreamEvent,
        { type: "statusUpdate" }
      >;
      expect(evt.event.taskId).toBe("t1");
      expect(evt.event.status.state).toBe("working");
      expect(evt.event.status.message?.role).toBe("agent");
    });

    it("parses SSE artifact update events", async () => {
      const sseData = JSON.stringify({
        artifact_update: {
          task_id: "t1",
          context_id: "ctx-1",
          artifact: {
            artifact_id: "a1",
            name: "Code",
            parts: [{ text: "print('hello')" }],
          },
          last_chunk: true,
        },
      });

      fetchMock.mockResolvedValue(
        mockSSEResponse([`data: ${sseData}`, "", ""]),
      );

      const events: A2AStreamEvent[] = [];
      for await (const event of client.streamMessage(userMessage)) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe("artifactUpdate");
      const evt = events[0] as Extract<
        A2AStreamEvent,
        { type: "artifactUpdate" }
      >;
      expect(evt.event.artifact.artifactId).toBe("a1");
      expect(evt.event.lastChunk).toBe(true);
    });

    it("unwraps JSON-RPC envelope in SSE", async () => {
      const inner = {
        status_update: {
          task_id: "t1",
          context_id: "ctx-1",
          status: { state: "TASK_STATE_COMPLETED" },
        },
      };
      const sseData = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: inner,
      });

      fetchMock.mockResolvedValue(
        mockSSEResponse([`data: ${sseData}`, "", ""]),
      );

      const events: A2AStreamEvent[] = [];
      for await (const event of client.streamMessage(userMessage)) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe("statusUpdate");
    });

    it("parses multiple SSE events", async () => {
      const ev1 = JSON.stringify({
        status_update: {
          task_id: "t1",
          context_id: "ctx-1",
          status: { state: "TASK_STATE_WORKING" },
        },
      });
      const ev2 = JSON.stringify({
        status_update: {
          task_id: "t1",
          context_id: "ctx-1",
          status: { state: "TASK_STATE_COMPLETED" },
        },
      });

      fetchMock.mockResolvedValue(
        mockSSEResponse([`data: ${ev1}`, "", `data: ${ev2}`, "", ""]),
      );

      const events: A2AStreamEvent[] = [];
      for await (const event of client.streamMessage(userMessage)) {
        events.push(event);
      }

      expect(events).toHaveLength(2);
    });

    it("skips malformed SSE events", async () => {
      fetchMock.mockResolvedValue(
        mockSSEResponse(["data: {invalid json}", "", ""]),
      );

      const events: A2AStreamEvent[] = [];
      for await (const event of client.streamMessage(userMessage)) {
        events.push(event);
      }

      expect(events).toHaveLength(0);
    });
  });

  // --- Push notification configs ---

  describe("push notification configs", () => {
    it("createTaskPushNotificationConfig sends POST", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          id: "pnc-1",
          taskId: "t1",
          url: "https://hook.test/notify",
        }),
      );

      await client.createTaskPushNotificationConfig({
        taskId: "t1",
        url: "https://hook.test/notify",
      });

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe("https://agent.test/tasks/t1/pushNotificationConfigs");
      expect(init.method).toBe("POST");
    });

    it("getTaskPushNotificationConfig sends GET", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          id: "pnc-1",
          taskId: "t1",
          url: "https://hook.test",
        }),
      );

      await client.getTaskPushNotificationConfig("t1", "pnc-1");

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toBe(
        "https://agent.test/tasks/t1/pushNotificationConfigs/pnc-1",
      );
    });

    it("listTaskPushNotificationConfigs with pagination", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          configs: [],
          nextPageToken: "tok2",
        }),
      );

      await client.listTaskPushNotificationConfigs("t1", {
        pageSize: 5,
        pageToken: "tok1",
      });

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toContain("/tasks/t1/pushNotificationConfigs?");
      expect(url).toContain("page_size=5");
      expect(url).toContain("page_token=tok1");
    });

    it("listTaskPushNotificationConfigs without pagination", async () => {
      fetchMock.mockResolvedValue(mockFetchResponse({ configs: [] }));

      await client.listTaskPushNotificationConfigs("t1");

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toBe("https://agent.test/tasks/t1/pushNotificationConfigs");
    });

    it("deleteTaskPushNotificationConfig sends DELETE", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 204,
        statusText: "No Content",
        headers: new Headers(),
      });

      await client.deleteTaskPushNotificationConfig("t1", "pnc-1");

      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe(
        "https://agent.test/tasks/t1/pushNotificationConfigs/pnc-1",
      );
      expect(init.method).toBe("DELETE");
    });
  });

  // --- getExtendedAgentCard ---

  describe("getExtendedAgentCard", () => {
    it("fetches from /extendedAgentCard", async () => {
      fetchMock.mockResolvedValue(
        mockFetchResponse({
          name: "Extended",
          description: "desc",
          version: "1.0",
          supportedInterfaces: [],
          capabilities: {},
          defaultInputModes: [],
          defaultOutputModes: [],
          skills: [],
        }),
      );

      await client.getExtendedAgentCard();

      const [url] = fetchMock.mock.calls[0]!;
      expect(url).toBe("https://agent.test/extendedAgentCard");
    });
  });
});
