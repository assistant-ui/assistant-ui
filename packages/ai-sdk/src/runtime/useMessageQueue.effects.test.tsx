// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppendMessage } from "@assistant-ui/core";
import { useMessageQueue } from "./useMessageQueue";

const passiveEffects = vi.hoisted(() => ({ deferred: false }));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useEffect: (...[effect, deps]: Parameters<typeof actual.useEffect>) =>
      actual.useEffect(() => {
        if (!passiveEffects.deferred) return effect();
      }, deps),
  };
});

const message: AppendMessage = {
  role: "user",
  content: [{ type: "text", text: "pending" }],
  attachments: [],
  createdAt: new Date(0),
  parentId: null,
  sourceId: null,
  runConfig: {},
  metadata: { custom: {} },
};

afterEach(() => {
  passiveEffects.deferred = false;
  cleanup();
});

describe("useMessageQueue before passive effects", () => {
  it.each([true, false])(
    "holds sends while busy (busy on mount: %s)",
    async (initiallyBusy) => {
      passiveEffects.deferred = initiallyBusy;
      const send = vi.fn(async (_message: AppendMessage) => {});
      const { result, rerender } = renderHook(
        ({ isRunning }) =>
          useMessageQueue({
            enabled: true,
            isRunning,
            isSendDisabled: false,
            send,
            cancel: async () => {},
            interrupt: () => {},
          }),
        { initialProps: { isRunning: initiallyBusy } },
      );
      if (!initiallyBusy) {
        passiveEffects.deferred = true;
        rerender({ isRunning: true });
      }
      await act(async () => result.current.adapter!.enqueue(message));
      expect(send).not.toHaveBeenCalled();

      passiveEffects.deferred = false;
      rerender({ isRunning: false });
      await waitFor(() =>
        expect(send).toHaveBeenCalledExactlyOnceWith(message),
      );
    },
  );
});
