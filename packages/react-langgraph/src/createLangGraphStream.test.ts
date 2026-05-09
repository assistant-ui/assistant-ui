import { describe, expect, it, vi } from "vitest";
import {
  unstable_createLangGraphStream,
  type LangGraphStreamClient,
} from "./createLangGraphStream";
import type { LangChainMessage } from "./types";

const makeClient = () => {
  const stream = vi.fn(async function* (
    _threadId: string,
    _assistantId: string,
    _payload?: unknown,
  ) {
    yield { event: "metadata", data: { thread_id: "t-1" } };
  });
  const client = { runs: { stream } } as unknown as LangGraphStreamClient;
  return { client, stream };
};

const initialize = async () => ({
  remoteId: "r-1",
  externalId: "t-1",
});

const humanMessage: LangChainMessage = {
  type: "human",
  content: "hi",
};

describe("unstable_createLangGraphStream", () => {
  it("forwards abortSignal as signal and defaults onDisconnect to 'cancel'", async () => {
    const { client, stream } = makeClient();
    const abort = new AbortController();
    const callback = unstable_createLangGraphStream({
      client,
      assistantId: "graph-1",
    });

    await callback([humanMessage], {
      abortSignal: abort.signal,
      initialize,
    });

    expect(stream).toHaveBeenCalledWith(
      "t-1",
      "graph-1",
      expect.objectContaining({
        signal: abort.signal,
        onDisconnect: "cancel",
      }),
    );
  });

  it("defaults streamMode to ['messages','updates','custom']", async () => {
    const { client, stream } = makeClient();
    const callback = unstable_createLangGraphStream({
      client,
      assistantId: "graph-1",
    });

    await callback([humanMessage], {
      abortSignal: new AbortController().signal,
      initialize,
    });

    expect(stream).toHaveBeenCalledWith(
      "t-1",
      "graph-1",
      expect.objectContaining({
        streamMode: ["messages", "updates", "custom"],
      }),
    );
  });

  it("honors custom streamMode and onDisconnect", async () => {
    const { client, stream } = makeClient();
    const callback = unstable_createLangGraphStream({
      client,
      assistantId: "graph-1",
      streamMode: ["values"],
      onDisconnect: "continue",
    });

    await callback([humanMessage], {
      abortSignal: new AbortController().signal,
      initialize,
    });

    expect(stream).toHaveBeenCalledWith(
      "t-1",
      "graph-1",
      expect.objectContaining({
        streamMode: ["values"],
        onDisconnect: "continue",
      }),
    );
  });

  it("sends input=null when no messages (command-only flow)", async () => {
    const { client, stream } = makeClient();
    const callback = unstable_createLangGraphStream({
      client,
      assistantId: "graph-1",
    });

    await callback([], {
      abortSignal: new AbortController().signal,
      command: { resume: "go" },
      initialize,
    });

    expect(stream).toHaveBeenCalledWith(
      "t-1",
      "graph-1",
      expect.objectContaining({
        input: null,
        command: { resume: "go" },
      }),
    );
  });

  it("wraps checkpointId as checkpoint.checkpoint_id", async () => {
    const { client, stream } = makeClient();
    const callback = unstable_createLangGraphStream({
      client,
      assistantId: "graph-1",
    });

    await callback([humanMessage], {
      abortSignal: new AbortController().signal,
      checkpointId: "cp-42",
      initialize,
    });

    expect(stream).toHaveBeenCalledWith(
      "t-1",
      "graph-1",
      expect.objectContaining({
        checkpoint: { checkpoint_id: "cp-42" },
      }),
    );
  });

  it("forwards runConfig as config", async () => {
    const { client, stream } = makeClient();
    const callback = unstable_createLangGraphStream({
      client,
      assistantId: "graph-1",
    });
    const runConfig = { configurable: { model_name: "gpt-4" } };

    await callback([humanMessage], {
      abortSignal: new AbortController().signal,
      runConfig,
      initialize,
    });

    expect(stream).toHaveBeenCalledWith(
      "t-1",
      "graph-1",
      expect.objectContaining({ config: runConfig }),
    );
  });

  it("omits checkpoint and config keys when unset", async () => {
    const { client, stream } = makeClient();
    const callback = unstable_createLangGraphStream({
      client,
      assistantId: "graph-1",
    });

    await callback([humanMessage], {
      abortSignal: new AbortController().signal,
      initialize,
    });

    const payload = stream.mock.calls[0]![2]!;
    expect(payload).not.toHaveProperty("checkpoint");
    expect(payload).not.toHaveProperty("config");
  });

  it("throws when initialize returns no externalId", async () => {
    const { client } = makeClient();
    const callback = unstable_createLangGraphStream({
      client,
      assistantId: "graph-1",
    });

    await expect(
      callback([humanMessage], {
        abortSignal: new AbortController().signal,
        initialize: async () => ({ remoteId: "r-1", externalId: undefined }),
      }),
    ).rejects.toThrow("Thread has not been initialized.");
  });
});
