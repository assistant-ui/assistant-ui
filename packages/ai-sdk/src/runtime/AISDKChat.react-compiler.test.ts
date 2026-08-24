import { describe, expect, it, vi } from "vitest";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import { AISDKChat } from "./AISDKChat";
import { createControlledTransport } from "./__tests__/controlled-transport";

// Runs the streaming round trip against the compiled dist entry (aliased in
// vitest.react-compiler.config.ts), so the react-compiler transform and the
// react-shim import rewrite are exercised, not just the source hooks.
describe("AISDKChat compiled output", () => {
  it("streams a chat round trip through the compiled entry", async () => {
    const { transport, emit, close } = createControlledTransport();
    const handle = createAssistantClient(
      AuiConfig({ threads: AISDKChat({ transport }) }),
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
