import { describe, expect, it, onTestFinished, vi } from "vitest";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import {
  captureThreadRuntimeGeneration,
  disposeThreadRuntime,
  invalidateThreadRuntime,
} from "./thread-runtime-lifecycle";

const createRuntime = (disconnectVoice: () => void = vi.fn()) =>
  ({
    voice: { status: { type: "running" } },
    disconnectVoice,
  }) as unknown as ThreadRuntimeCore;

describe("thread runtime lifecycle", () => {
  it("starts a fresh generation after invalidation", () => {
    const runtime = createRuntime();
    const generation = captureThreadRuntimeGeneration(runtime);

    invalidateThreadRuntime(runtime);

    expect(generation.aborted).toBe(true);
    expect(captureThreadRuntimeGeneration(runtime).aborted).toBe(false);
  });

  it("keeps a disposed runtime aborted through a later invalidation", () => {
    const disconnectVoice = vi.fn();
    const runtime = createRuntime(disconnectVoice);

    disposeThreadRuntime(runtime);
    invalidateThreadRuntime(runtime);

    expect(captureThreadRuntimeGeneration(runtime).aborted).toBe(true);
    expect(disconnectVoice).toHaveBeenCalledOnce();
  });

  it("reports a voice disconnect that throws instead of rethrowing it", () => {
    const error = new Error("disconnect failed");
    const runtime = createRuntime(() => {
      throw error;
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    onTestFinished(() => consoleError.mockRestore());

    expect(() => disposeThreadRuntime(runtime)).not.toThrow();
    expect(consoleError).toHaveBeenCalledExactlyOnceWith(
      "[assistant-ui] Voice cleanup threw during thread disposal",
      error,
    );
    expect(captureThreadRuntimeGeneration(runtime).aborted).toBe(true);
  });
});
