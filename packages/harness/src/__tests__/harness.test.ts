import { describe, expect, it, vi } from "vitest";
import { Harness } from "../Harness";
import type {
  HarnessRunInput,
  HarnessTransport,
} from "../transport/HarnessTransport";
import {
  createInitialState,
  type HarnessCommand,
  type HarnessMessage,
  type HarnessState,
} from "../types";

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

type PushStream = {
  iterable: AsyncIterable<HarnessState>;
  push: (state: Partial<HarnessState>) => void;
  end: () => void;
  fail: (error: unknown) => void;
};

const createPushStream = (): PushStream => {
  const queue: HarnessState[] = [];
  let wake: (() => void) | null = null;
  let done = false;
  let error: unknown = null;

  const notify = () => {
    wake?.();
    wake = null;
  };

  return {
    iterable: {
      async *[Symbol.asyncIterator]() {
        for (;;) {
          while (queue.length > 0) yield queue.shift()!;
          if (error) throw error;
          if (done) return;
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
        }
      },
    },
    push: (state) => {
      queue.push({ ...createInitialState(), ...state });
      notify();
    },
    end: () => {
      done = true;
      notify();
    },
    fail: (e) => {
      error = e;
      notify();
    },
  };
};

type RecordedRun = {
  input: HarnessRunInput | Omit<HarnessRunInput, "commands">;
  commands: readonly HarnessCommand[];
  kind: "run" | "resume";
  stream: PushStream;
};

class MockTransport implements HarnessTransport {
  runs: RecordedRun[] = [];

  #record(
    kind: "run" | "resume",
    input: HarnessRunInput | Omit<HarnessRunInput, "commands">,
    commands: readonly HarnessCommand[],
  ) {
    const stream = createPushStream();
    input.signal.addEventListener("abort", () =>
      stream.fail(new DOMException("aborted", "AbortError")),
    );
    this.runs.push({ input, commands, kind, stream });
    return stream.iterable;
  }

  run(input: HarnessRunInput) {
    return this.#record("run", input, input.commands);
  }

  resume(input: Omit<HarnessRunInput, "commands">) {
    return this.#record("resume", input, []);
  }

  get last() {
    return this.runs[this.runs.length - 1]!;
  }
}

const createHarness = (options?: { resume?: boolean }) => {
  const transport = new MockTransport();
  const harness = new Harness({ transport, id: "thread-1", ...options });
  return { transport, harness };
};

describe("Harness", () => {
  it("applies sends optimistically and merges the echo by id", async () => {
    const { transport, harness } = createHarness();

    harness.sendMessage("hello");

    const optimistic = harness.getState().messages;
    expect(optimistic).toHaveLength(1);
    expect(optimistic[0]).toMatchObject({
      role: "user",
      parentId: null,
      parts: [{ type: "text", text: "hello" }],
    });
    expect(harness.getState().status).toBe("submitted");

    await flush();
    expect(transport.runs).toHaveLength(1);
    expect(transport.last.input).toMatchObject({ threadId: "thread-1" });
    const [command] = transport.last.commands;
    expect(command).toMatchObject({
      type: "send-message",
      id: optimistic[0]!.id,
      behavior: "queue",
    });

    const echoed: HarnessMessage = {
      id: optimistic[0]!.id,
      parentId: null,
      role: "user",
      parts: [{ type: "text", text: "hello" }],
    };
    transport.last.stream.push({ messages: { [echoed.id]: echoed } });
    await flush();
    expect(harness.getState().status).toBe("streaming");
    expect(harness.getState().messages).toEqual([echoed]);

    transport.last.stream.end();
    await flush();
    expect(harness.getState().status).toBe("ready");
    expect(harness.getState().messages).toEqual([echoed]);
  });

  it("moves a send accepted mid-run from messages into the queue", async () => {
    const { transport, harness } = createHarness();

    harness.sendMessage("first");
    await flush();

    harness.sendMessage("second");
    expect(harness.getState().messages).toHaveLength(2);
    const queuedId = harness.getState().messages[1]!.id;

    transport.last.stream.push({
      queue: [{ id: queuedId, parts: [{ type: "text", text: "second" }] }],
    });
    await flush();
    expect(harness.getState().messages).toHaveLength(1);
    expect(harness.getState().queue).toEqual([
      { id: queuedId, parts: [{ type: "text", text: "second" }] },
    ]);
  });

  it("batches same-tick commands into one request", async () => {
    const { transport, harness } = createHarness();

    harness.cancelQueued("q1");
    harness.sendNow("q2");
    await flush();

    expect(transport.runs).toHaveLength(1);
    expect(transport.last.commands).toEqual([
      { type: "cancel-queued", id: "q1" },
      { type: "send-now", id: "q2" },
    ]);
  });

  it("surfaces transport errors and clears them on the next run", async () => {
    const onError = vi.fn();
    const transport = new MockTransport();
    const harness = new Harness({ transport, onError });

    harness.sendMessage("hello");
    await flush();
    transport.last.stream.fail(new Error("boom"));
    await flush();

    expect(harness.getState().status).toBe("error");
    expect(harness.getState().error).toEqual({ message: "boom" });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "boom" }),
    );

    harness.sendMessage("retry");
    expect(harness.getState().status).toBe("submitted");
    expect(harness.getState().error).toBeNull();
  });

  it("stop() aborts the stream and delivers a cancel command", async () => {
    const { transport, harness } = createHarness();

    harness.sendMessage("hello");
    await flush();
    const run = transport.last;

    harness.stop();
    await flush();
    expect(run.input.signal.aborted).toBe(true);
    expect(transport.runs).toHaveLength(2);
    expect(transport.last.commands).toEqual([{ type: "cancel" }]);

    transport.last.stream.push({ status: { phase: "idle" } });
    transport.last.stream.end();
    await flush();
    expect(harness.getState().status).toBe("ready");
  });

  it("dispose() aborts an in-flight run", async () => {
    const { transport, harness } = createHarness();

    harness.sendMessage("hello");
    await flush();
    const run = transport.last;
    expect(run.input.signal.aborted).toBe(false);

    harness.dispose();
    await flush();
    expect(run.input.signal.aborted).toBe(true);
    expect(transport.runs).toHaveLength(1);
  });

  it("exposes interrupts and answers them via resume", async () => {
    const { transport, harness } = createHarness();

    harness.sendMessage("hello");
    await flush();
    transport.last.stream.push({
      interrupt: { id: "int-1", value: { tool: "rm" }, resumable: true },
    });
    transport.last.stream.end();
    await flush();
    expect(harness.getState().interrupt).toEqual({
      id: "int-1",
      value: { tool: "rm" },
      resumable: true,
    });

    harness.resume("int-1", { approved: true });
    await flush();
    expect(transport.last.commands).toEqual([
      { type: "resume", interruptId: "int-1", value: { approved: true } },
    ]);
  });

  it("resumes on mount when resume is set", async () => {
    const { transport, harness } = createHarness({ resume: true });

    await flush();
    expect(transport.runs).toHaveLength(1);
    expect(transport.last.kind).toBe("resume");

    const message: HarnessMessage = {
      id: "m1",
      parentId: null,
      role: "assistant",
      parts: [{ type: "text", text: "welcome back" }],
    };
    transport.last.stream.push({ messages: { m1: message } });
    transport.last.stream.end();
    await flush();
    expect(harness.getState().messages).toEqual([message]);
    expect(harness.getState().status).toBe("ready");
  });

  it("derives recursive subagent transcripts from tool-call-rooted messages", async () => {
    const { transport, harness } = createHarness();

    const messages: Record<string, HarnessMessage> = {
      m1: {
        id: "m1",
        parentId: null,
        role: "assistant",
        parts: [
          {
            type: "tool",
            toolCallId: "tc1",
            toolName: "task",
            state: "running",
          },
        ],
      },
      s1: {
        id: "s1",
        parentId: "tc1",
        role: "assistant",
        parts: [
          {
            type: "tool",
            toolCallId: "tc2",
            toolName: "bash",
            state: "running",
          },
        ],
      },
      s2: {
        id: "s2",
        parentId: "tc2",
        role: "assistant",
        parts: [{ type: "text", text: "nested output" }],
      },
    };

    harness.sendMessage("go");
    await flush();
    transport.last.stream.push({ messages });
    transport.last.stream.end();
    await flush();

    const state = harness.getState();
    expect(state.messages.map((m) => m.id)).toEqual(["m1"]);
    const tc1 = state.subagents["tc1"]!;
    expect(tc1.messages.map((m) => m.id)).toEqual(["s1"]);
    expect(tc1.subagents["tc2"]!.messages.map((m) => m.id)).toEqual(["s2"]);
  });

  it("drops subagents rooted in discarded branches", async () => {
    const { transport, harness } = createHarness();

    const messages: Record<string, HarnessMessage> = {
      old: {
        id: "old",
        parentId: null,
        role: "assistant",
        parts: [
          {
            type: "tool",
            toolCallId: "tc-old",
            toolName: "task",
            state: "complete",
          },
        ],
      },
      sOld: {
        id: "sOld",
        parentId: "tc-old",
        role: "assistant",
        parts: [{ type: "text", text: "stale" }],
      },
      current: {
        id: "current",
        parentId: null,
        role: "assistant",
        parts: [{ type: "text", text: "active branch" }],
      },
    };

    harness.sendMessage("go");
    await flush();
    transport.last.stream.push({ messages });
    transport.last.stream.end();
    await flush();

    const state = harness.getState();
    expect(state.messages.map((m) => m.id)).toEqual(["current"]);
    expect(state.subagents).toEqual({});
  });
});
