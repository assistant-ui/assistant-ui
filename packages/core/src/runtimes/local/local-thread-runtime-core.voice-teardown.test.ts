import { describe, expect, it, vi } from "vitest";
import { LocalRuntimeCore } from "./local-runtime-core";
import type { RealtimeVoiceAdapter } from "../../adapters/voice";
import { invalidateThreadRuntime } from "../../runtime/utils/thread-runtime-lifecycle";

describe("LocalThreadRuntimeCore voice teardown", () => {
  it("disconnects without committing an unfinished transcript when detached", async () => {
    const disconnect = vi.fn();
    let emitTranscript:
      | ((item: RealtimeVoiceAdapter.TranscriptItem) => void)
      | undefined;
    let staleTranscript!: (item: RealtimeVoiceAdapter.TranscriptItem) => void;
    const session: RealtimeVoiceAdapter.Session = {
      status: { type: "running" },
      isMuted: false,
      disconnect,
      mute: vi.fn(),
      unmute: vi.fn(),
      onStatusChange: () => () => {},
      onTranscript: (callback) => {
        emitTranscript = callback;
        staleTranscript = callback;
        return () => {
          emitTranscript = undefined;
        };
      },
      onModeChange: () => () => {},
      onVolumeChange: () => () => {},
    };
    const history = {
      load: vi.fn(async () => ({ messages: [] })),
      append: vi.fn(async () => {}),
    };
    const runtime = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: { run: async () => ({ content: [] }) },
          voice: { connect: () => session },
          history,
        },
      },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    await thread.__internal_load();
    thread.connectVoice();
    emitTranscript?.({ role: "assistant", text: "unfinished" });

    expect(thread.messages).toHaveLength(1);
    expect(history.append).not.toHaveBeenCalled();

    thread.detach();

    expect(disconnect).toHaveBeenCalledOnce();
    expect(thread.voice).toBeUndefined();
    expect(emitTranscript).toBeUndefined();
    expect(thread.messages).toHaveLength(0);
    expect(thread.export().messages).toHaveLength(0);
    expect(history.append).not.toHaveBeenCalled();

    invalidateThreadRuntime(thread);
    emitTranscript?.({ role: "assistant", text: "late" });
    staleTranscript({ role: "assistant", text: "late from stale callback" });
    expect(thread.messages).toHaveLength(0);
    expect(history.append).not.toHaveBeenCalled();
  });

  it("aborts pending work when voice cleanup throws during detach", () => {
    const session: RealtimeVoiceAdapter.Session = {
      status: { type: "running" },
      isMuted: false,
      disconnect: () => {
        throw new Error("disconnect failed");
      },
      mute: vi.fn(),
      unmute: vi.fn(),
      onStatusChange: () => () => {},
      onTranscript: () => () => {},
      onModeChange: () => () => {},
      onVolumeChange: () => () => {},
    };
    const runtime = new LocalRuntimeCore(
      {
        adapters: {
          chatModel: { run: async () => ({ content: [] }) },
          voice: { connect: () => session },
        },
      },
      undefined,
    );
    const thread = runtime.threads.getMainThreadRuntimeCore();
    const internals = thread as unknown as {
      abortController: AbortController | null;
    };
    const pending = new AbortController();
    thread.connectVoice();
    internals.abortController = pending;

    expect(() => thread.detach()).toThrow("disconnect failed");
    expect(pending.signal.aborted).toBe(true);
  });
});
