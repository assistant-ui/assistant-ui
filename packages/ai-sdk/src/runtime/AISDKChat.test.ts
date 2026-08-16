import { afterEach, describe, expect, it, vi } from "vitest";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import { AISDKChat } from "./AISDKChat";
import {
  createCancellableTransport,
  createControlledTransport,
} from "./__tests__/controlled-transport";

describe("AISDKChat as a standalone client config entry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("streams a chat round trip without React", async () => {
    const { transport, emit, close } = createControlledTransport();
    const handle = createAssistantClient(
      AuiConfig({ threads: AISDKChat({ transport }) }),
    );
    try {
      handle.subscribe(() => {});
      const aui = handle.getClient();

      expect(aui.thread.getState().messages).toHaveLength(0);

      flushTapSync(() => aui.composer.setText("hi"));
      flushTapSync(() => aui.composer.send());

      await vi.waitFor(() => {
        const state = aui.thread.getState();
        expect(state.isRunning).toBe(true);
        expect(state.messages[0]).toMatchObject({ role: "user" });
      });

      emit(
        { type: "start" },
        { type: "text-start", id: "t1" },
        { type: "text-delta", id: "t1", delta: "hello " },
      );
      await vi.waitFor(() => {
        const last = aui.thread.getState().messages.at(-1);
        expect(last?.role).toBe("assistant");
        expect(last?.content).toContainEqual(
          expect.objectContaining({ type: "text", text: "hello " }),
        );
      });

      emit(
        { type: "text-delta", id: "t1", delta: "world" },
        { type: "text-end", id: "t1" },
        { type: "finish" },
      );
      close();

      await vi.waitFor(() => {
        const state = aui.thread.getState();
        expect(state.isRunning).toBe(false);
        expect(state.messages).toHaveLength(2);
        expect(state.messages.at(-1)?.content).toContainEqual(
          expect.objectContaining({ type: "text", text: "hello world" }),
        );
      });
    } finally {
      handle.destroy();
    }
  });

  it("stops an in-flight chat when its client is destroyed", async () => {
    const { transport, getCancelCount } = createCancellableTransport();
    const handle = createAssistantClient(
      AuiConfig({ threads: AISDKChat({ transport }) }),
    );
    handle.subscribe(() => {});
    const aui = handle.getClient();

    try {
      flushTapSync(() => aui.composer.setText("stop me"));
      flushTapSync(() => aui.composer.send());
      await vi.waitFor(() => {
        expect(aui.thread.getState().isRunning).toBe(true);
      });
    } finally {
      handle.destroy();
    }

    await vi.waitFor(() => {
      expect(getCancelCount()).toBe(1);
    });
  });

  it("stops a soft-unmounted chat on later client destruction", async () => {
    const { transport, getCancelCount } = createCancellableTransport();
    const handle = createAssistantClient(
      AuiConfig({ threads: AISDKChat({ transport }) }),
    );
    const release = handle.subscribe(() => {});
    const aui = handle.getClient();

    flushTapSync(() => aui.composer.setText("keep streaming"));
    flushTapSync(() => aui.composer.send());
    await vi.waitFor(() => {
      expect(aui.thread.getState().isRunning).toBe(true);
    });

    release();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getCancelCount()).toBe(0);

    handle.destroy();
    await vi.waitFor(() => {
      expect(getCancelCount()).toBe(1);
    });
  });

  it("installs the RuntimeAdapter scope defaults", () => {
    const { transport } = createControlledTransport();
    const handle = createAssistantClient(
      AuiConfig({ threads: AISDKChat({ transport }) }),
    );
    try {
      handle.subscribe(() => {});
      const aui = handle.getClient();

      expect(aui.threads.getState().mainThreadId).toBeDefined();
      expect(aui.tools.getState()).toBeDefined();
      expect(aui.dataRenderers.getState()).toBeDefined();
      expect(aui.thread.getState().isRunning).toBe(false);
    } finally {
      handle.destroy();
    }
  });

  it("mounts with the default transport when no options are given", () => {
    const handle = createAssistantClient(AuiConfig({ threads: AISDKChat({}) }));
    try {
      handle.subscribe(() => {});
      const aui = handle.getClient();

      expect(aui.thread.getState().messages).toHaveLength(0);
      expect(aui.thread.getState().isRunning).toBe(false);
    } finally {
      handle.destroy();
    }
  });

  it("sends through the default AssistantChatTransport with the generated id", async () => {
    const sse = [
      { type: "start" },
      { type: "text-start", id: "t1" },
      { type: "text-delta", id: "t1", delta: "ok" },
      { type: "text-end", id: "t1" },
      { type: "finish" },
    ]
      .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
      .join("");
    const fetchMock = vi.fn(
      async () =>
        new Response(sse, {
          headers: { "content-type": "text/event-stream" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const handle = createAssistantClient(
      AuiConfig({ threads: AISDKChat({ id: "test-thread-1" }) }),
    );
    try {
      handle.subscribe(() => {});
      const aui = handle.getClient();

      flushTapSync(() => aui.composer.setText("hi"));
      flushTapSync(() => aui.composer.send());

      await vi.waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const state = aui.thread.getState();
        expect(state.isRunning).toBe(false);
        expect(state.messages).toHaveLength(2);
      });

      const [url, init] = fetchMock.mock.calls[0]! as [
        RequestInfo,
        RequestInit,
      ];
      expect(String(url)).toContain("/api/chat");
      const body = JSON.parse(init.body as string);
      expect(body.id).toBe("test-thread-1");
      expect(body.messages).toHaveLength(1);
    } finally {
      handle.destroy();
    }
  });
});
