import { describe, it, expect, vi } from "vitest";
import type { AppendMessage } from "@assistant-ui/core";
import type { HttpAgent } from "@ag-ui/client";
import { AgUiThreadRuntimeCore } from "../src/runtime/AgUiThreadRuntimeCore";
import { makeLogger, type Logger } from "../src/runtime/logger";

const createAppendMessage = (): AppendMessage => ({
  role: "user",
  content: [{ type: "text" as const, text: "hi" }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(),
  parentId: null,
  sourceId: null,
  runConfig: {},
  startRun: true,
});

const createCore = (agent: HttpAgent, logger: Logger = makeLogger()) =>
  new AgUiThreadRuntimeCore({
    agent,
    logger,
    showThinking: false,
    notifyUpdate: () => {},
  });

const stateAgent = (emit: (subscriber: any) => void): HttpAgent =>
  ({
    runAgent: vi.fn(async (_input: unknown, subscriber: any) => {
      emit(subscriber);
      subscriber.onRunFinalized?.();
    }),
  }) as unknown as HttpAgent;

describe("STATE_DELTA handling", () => {
  it("applies a JSON patch to the state snapshot", async () => {
    const core = createCore(
      stateAgent((s) => {
        s.onStateSnapshotEvent?.({
          event: {
            type: "STATE_SNAPSHOT",
            snapshot: { count: 0, name: "test" },
          },
        });
        s.onStateDeltaEvent?.({
          event: {
            type: "STATE_DELTA",
            delta: [{ op: "replace", path: "/count", value: 42 }],
          },
        });
      }),
    );

    await core.append(createAppendMessage());

    expect(core.getState()).toEqual({ count: 42, name: "test" });
  });

  it("isolates a malformed delta: the run does not crash and state is unchanged", async () => {
    const error = vi.fn();
    const core = createCore(
      stateAgent((s) => {
        s.onStateSnapshotEvent?.({
          event: { type: "STATE_SNAPSHOT", snapshot: { count: 0 } },
        });
        s.onStateDeltaEvent?.({
          event: {
            type: "STATE_DELTA",
            delta: [{ op: "replace", path: "/missing", value: 1 }],
          },
        });
      }),
      makeLogger({ error }),
    );

    await expect(core.append(createAppendMessage())).resolves.toBeUndefined();

    expect(core.getState()).toEqual({ count: 0 });
    expect(error).toHaveBeenCalled();
    expect(core.isRunning()).toBe(false);
  });

  it("isolates a delta that arrives before any snapshot", async () => {
    const error = vi.fn();
    const core = createCore(
      stateAgent((s) => {
        s.onStateDeltaEvent?.({
          event: {
            type: "STATE_DELTA",
            delta: [{ op: "replace", path: "/count", value: 1 }],
          },
        });
      }),
      makeLogger({ error }),
    );

    await core.append(createAppendMessage());

    expect(core.getState()).toBeUndefined();
    expect(error).toHaveBeenCalled();
  });
});
