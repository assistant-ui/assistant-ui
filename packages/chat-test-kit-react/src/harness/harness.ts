import {
  Replayer,
  VirtualClock,
  type TranscriptType,
} from "@assistant-ui/chat-test-kit-core";
import type { AssistantRuntime } from "@assistant-ui/react";
import { createAssistantUIAdapter } from "./adapter";
import { EventBridge } from "./bridge";
import { buildChatModelAdapter } from "./chat-model-adapter";
import type { ChatTestHarness, HarnessOptions } from "./types";
import { createWrapper } from "./wrapper";

export function createChatTestHarness(
  options: HarnessOptions,
): ChatTestHarness {
  const transcript: TranscriptType = options.transcript;
  const autoAdvance = options.autoAdvance ?? true;

  const bridge = new EventBridge();
  const runtimeRef: { current: AssistantRuntime | null } = { current: null };

  let autoAdvancePromise: Promise<void> | null = null;
  const adapter = createAssistantUIAdapter({
    bridge,
    onAbort: () => {
      runtimeRef.current?.thread.cancelRun?.();
    },
  });
  const clock = new VirtualClock();
  const replayer = new Replayer({ transcript, adapter, clock });

  const kickAutoAdvance = () => {
    if (!autoAdvance) return;
    if (autoAdvancePromise) return;
    autoAdvancePromise = (async () => {
      try {
        await replayer.advanceToIdle();
      } finally {
        bridge.end();
        autoAdvancePromise = null;
      }
    })();
  };

  const chatModelAdapter = buildChatModelAdapter({
    bridge,
    onRunStart: kickAutoAdvance,
  });
  const wrapper = createWrapper({ chatModelAdapter, runtimeRef });

  const harness: ChatTestHarness = {
    wrapper,
    async waitForIdle() {
      await replayer.advanceToIdle();
      bridge.end();
      await Promise.resolve();
    },
    async cancel() {
      await replayer.cancel();
      bridge.end();
    },
    async advanceChunk() {
      await replayer.tick();
    },
    async advanceToolCall() {
      await replayer.advanceToNextTurn();
    },
    inject: {
      async disconnect() {
        await adapter.emit({ type: "disconnect" });
      },
      async transportError({ code, message }) {
        await adapter.emit({
          type: "transport-error",
          ...(code !== undefined ? { code } : {}),
          message,
        });
      },
    },
    getReplayState() {
      return replayer.state;
    },
    timeline() {
      return adapter.timeline();
    },
    getRuntimeSnapshot() {
      return adapter.getSnapshot();
    },
    getRuntime() {
      return runtimeRef.current;
    },
  };

  return harness;
}
