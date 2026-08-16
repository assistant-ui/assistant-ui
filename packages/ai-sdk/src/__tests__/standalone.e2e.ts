import { describe, expect, it, vi } from "vitest";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import * as aiSdk from "../index";
import { createControlledTransport } from "../runtime/__tests__/controlled-transport";

describe("react-less standalone graph", () => {
  it("resolves react to the standalone shim", async () => {
    const react = await import("react");
    expect(() => react.useState(0)).toThrow(/standalone-shim/);
  });

  it("loads the whole barrel under the standalone shim", () => {
    expect(typeof aiSdk.AISDKChat).toBe("function");
    expect(typeof aiSdk.useChatRuntime).toBe("function");
    expect(typeof aiSdk.useAISDKRuntime).toBe("function");
    expect(typeof aiSdk.frontendTools).toBe("function");
    expect(typeof aiSdk.AssistantChatTransport).toBe("function");
  });

  it("streams a chat round trip with the shim as the only react", async () => {
    const { transport, emit, close } = createControlledTransport();
    const handle = createAssistantClient(
      AuiConfig({ threads: aiSdk.AISDKChat({ transport }) }),
    );
    try {
      handle.subscribe(() => {});
      const aui = handle.getClient();

      flushTapSync(() => aui.composer.setText("hi"));
      flushTapSync(() => aui.composer.send());

      await vi.waitFor(() => {
        expect(aui.thread.getState().isRunning).toBe(true);
      });

      emit(
        { type: "start" },
        { type: "text-start", id: "t1" },
        { type: "text-delta", id: "t1", delta: "hello " },
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
});
