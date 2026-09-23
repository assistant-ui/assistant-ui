import { describe, expect, it, vi } from "vitest";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import {
  captureThreadRuntimeGeneration,
  disposeThreadRuntime,
  invalidateThreadRuntime,
} from "./thread-runtime-lifecycle";

const createRuntime = (disconnectVoice: () => void) =>
  ({
    voice: { status: { type: "running" } },
    disconnectVoice,
  }) as unknown as ThreadRuntimeCore;

describe("thread runtime lifecycle", () => {
  it("keeps a disposed runtime aborted through later invalidation", () => {
    const disconnectVoice = vi.fn();
    const runtime = createRuntime(disconnectVoice);

    const generation = captureThreadRuntimeGeneration(runtime);
    disposeThreadRuntime(runtime);
    invalidateThreadRuntime(runtime);

    expect(generation.aborted).toBe(true);
    expect(captureThreadRuntimeGeneration(runtime).aborted).toBe(true);
    expect(disconnectVoice).toHaveBeenCalledOnce();
  });
});
