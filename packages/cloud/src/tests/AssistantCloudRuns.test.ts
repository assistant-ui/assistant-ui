import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantCloudAPI } from "../AssistantCloudAPI";
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

describe("AssistantCloudRuns", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
