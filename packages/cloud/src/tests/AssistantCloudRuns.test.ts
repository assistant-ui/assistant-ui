import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantCloudAPI } from "../AssistantCloudAPI";
import { AssistantCloud } from "../AssistantCloud";
import { AssistantCloudRuns } from "../AssistantCloudRuns";
import { CloudResponseError } from "../cloudResponse";

const createCloud = () =>
  new AssistantCloud({
    apiKey: "test-key",
    userId: "user-id",
    workspaceId: "workspace-id",
  });

const streamBody = {
  thread_id: "thread-id",
  assistant_id: "system/thread_title" as const,
  messages: [],
};

const jwt = `${Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")}.${Buffer.from(JSON.stringify({ exp: 4102444800, sub: "user-id" })).toString("base64url")}.sig`;

describe("AssistantCloudRuns", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    {
      name: "API key",
      createApi: () =>
        new AssistantCloudAPI({
          apiKey: "test-key",
          userId: "user-id",
          workspaceId: "workspace-id",
        }),
      authHeaders: {
        Authorization: "Bearer test-key",
        "Aui-User-Id": "user-id",
        "Aui-Workspace-Id": "workspace-id",
      },
    },
    {
      name: "JWT",
      createApi: () =>
        new AssistantCloudAPI({
          baseUrl: "https://test.example.com",
          authToken: async () => jwt,
        }),
      authHeaders: { Authorization: `Bearer ${jwt}` },
    },
  ])(
    "keeps request and streaming headers for $name auth",
    async ({ createApi, authHeaders }) => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response("Generated title", {
          headers: { "Content-Type": "text/plain" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const api = createApi();
      const runs = new AssistantCloudRuns(api);
      api.registerSdk({ name: "@assistant-ui/core", version: "0.3.18" });
      const sdkHeader = api.sdkHeader();

      await api.makeRawRequest("/threads", { headers: { "X-Test": "1" } });
      await runs.stream(streamBody);
      const optionHeaders = await runs
        .__internal_getAssistantOptions("assistant-id")
        .headers();

      expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
        ...authHeaders,
        "X-Test": "1",
        "Content-Type": "application/json",
        "Aui-Sdk": sdkHeader,
      });
      expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({
        ...authHeaders,
        Accept: "text/plain",
        "Content-Type": "application/json",
        "Aui-Sdk": sdkHeader,
      });
      expect(optionHeaders).toEqual({
        ...authHeaders,
        Accept: "text/plain",
        "Aui-Sdk": sdkHeader,
      });
    },
  );

  it("decodes text/plain run streams", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Generated title", {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
      ),
    );
    const stream = await createCloud().runs.stream(streamBody);
    let text = "";

    await stream.pipeTo(
      new WritableStream({
        write(chunk) {
          if (chunk.type === "text-delta") text += chunk.textDelta;
        },
      }),
    );

    expect(text).toBe("Generated title");
  });

  it("rejects successful run responses without a body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

    await expect(createCloud().runs.stream(streamBody)).rejects.toThrow(
      new CloudResponseError(
        'Invalid Assistant Cloud response for "run stream": expected a response body',
      ),
    );
  });

  it("rejects and cancels run responses with the wrong content type", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({ cancel });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(body, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      ),
    );

    await expect(createCloud().runs.stream(streamBody)).rejects.toThrow(
      new CloudResponseError(
        'Invalid Assistant Cloud response for "run stream": expected a "text/plain" content type, received "text/html; charset=utf-8"',
      ),
    );
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("rejects and cancels run responses without a content type", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({ cancel });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));

    await expect(createCloud().runs.stream(streamBody)).rejects.toThrow(
      new CloudResponseError(
        'Invalid Assistant Cloud response for "run stream": expected a "text/plain" content type, received no Content-Type header',
      ),
    );
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("pins the UI message stream protocol in assistant options", () => {
    const { protocol } =
      createCloud().runs.__internal_getAssistantOptions("assistant-id");

    expect(protocol).toBe("ui-message-stream");
  });

  it("uses the requested thread ID in assistant options", async () => {
    const { body } =
      createCloud().runs.__internal_getAssistantOptions("assistant-id");

    await expect(body({ threadId: "remote-thread" })).resolves.toEqual({
      assistant_id: "assistant-id",
      response_format: "vercel-ai-data-stream/v1",
      thread_id: "remote-thread",
    });
  });

  it("rejects assistant options without a thread ID", async () => {
    const { body } =
      createCloud().runs.__internal_getAssistantOptions("assistant-id");

    await expect(body({})).rejects.toThrow(
      "Assistant Cloud runs need a thread",
    );
    await expect(body()).rejects.toThrow("Assistant Cloud runs need a thread");
  });
});

const createCloudRuns = () => {
  const makeRequest = vi.fn();
  const api = { makeRequest } as unknown as AssistantCloudAPI;
  return { runs: new AssistantCloudRuns(api), makeRequest };
};

describe("AssistantCloudRuns responses", () => {
  it("validates reported run IDs", async () => {
    const { runs, makeRequest } = createCloudRuns();
    const body = { thread_id: "thread-1", status: "completed" } as const;
    makeRequest.mockResolvedValueOnce({ run_id: "run-1" });

    await expect(runs.report(body)).resolves.toEqual({ run_id: "run-1" });

    makeRequest.mockResolvedValueOnce({});

    await expect(runs.report(body)).rejects.toThrow(
      'Invalid Assistant Cloud response for "run_id": expected a string',
    );
  });
});
