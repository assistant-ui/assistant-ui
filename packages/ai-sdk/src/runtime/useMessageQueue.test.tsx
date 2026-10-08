// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppendMessage } from "@assistant-ui/core";
import { useMessageQueue } from "./useMessageQueue";

const message = (text: string): AppendMessage => ({
  role: "user",
  content: [{ type: "text", text }],
  attachments: [],
  createdAt: new Date(0),
  parentId: null,
  sourceId: null,
  runConfig: {},
  metadata: { custom: {} },
});

afterEach(cleanup);

describe("useMessageQueue lifecycle", () => {
  it.each([true, false])(
    "keeps the replacement queue until idle (intermediate idle: %s)",
    async (intermediateIdle) => {
      let finish!: () => void;
      const firstRun = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const send = vi.fn(async (_message: AppendMessage) => {});
      send.mockReturnValueOnce(firstRun);
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
        { initialProps: { isRunning: false } },
      );
      await act(async () => result.current.adapter!.enqueue(message("first")));
      rerender({ isRunning: true });
      act(() => result.current.adapter!.steer(message("discarded")));
      act(() => result.current.clear());
      if (intermediateIdle) rerender({ isRunning: false });
      rerender({ isRunning: true });
      act(() => result.current.adapter!.enqueue(message("after replacement")));

      await act(async () => {
        finish();
        await firstRun;
      });
      expect(send).toHaveBeenCalledOnce();
      expect(result.current.adapter!.items.map((item) => item.prompt)).toEqual([
        "after replacement",
      ]);

      rerender({ isRunning: false });
      await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
      expect(send).toHaveBeenLastCalledWith(message("after replacement"));
    },
  );

  it("preserves pending messages while disabled and resumes when enabled", async () => {
    const send = vi.fn(async (_message: AppendMessage) => {});
    const { result, rerender } = renderHook(
      ({ enabled, isRunning }) =>
        useMessageQueue({
          enabled,
          isRunning,
          isSendDisabled: false,
          send,
          cancel: async () => {},
          interrupt: () => {},
        }),
      { initialProps: { enabled: true, isRunning: true } },
    );

    act(() => result.current.adapter!.enqueue(message("pending")));
    rerender({ enabled: false, isRunning: false });
    expect(result.current.adapter).toBeUndefined();
    expect(send).not.toHaveBeenCalled();

    rerender({ enabled: true, isRunning: false });
    await waitFor(() =>
      expect(send).toHaveBeenCalledExactlyOnceWith(message("pending")),
    );
  });

  it.each(["disable", "clear", "unmount"])(
    "%s prevents a waiting steer from dispatching",
    async (action) => {
      let finish!: () => void;
      const firstRun = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const send = vi.fn(async (_message: AppendMessage) => {});
      send.mockReturnValueOnce(firstRun);
      const { result, rerender, unmount } = renderHook(
        ({ enabled, isRunning }) =>
          useMessageQueue({
            enabled,
            isRunning,
            isSendDisabled: false,
            send,
            cancel: async () => {},
            interrupt: () => {},
          }),
        { initialProps: { enabled: true, isRunning: false } },
      );

      act(() => result.current.adapter!.enqueue(message("first")));
      await waitFor(() => expect(send).toHaveBeenCalledOnce());
      rerender({ enabled: true, isRunning: true });
      act(() => result.current.adapter!.steer(message("second")));
      if (action === "unmount") unmount();
      else {
        if (action === "clear") act(() => result.current.clear());
        rerender({ enabled: action !== "disable", isRunning: false });
      }
      await act(async () => {
        finish();
        await firstRun;
      });
      expect(send).toHaveBeenCalledOnce();

      if (action === "disable") {
        rerender({ enabled: true, isRunning: false });
        await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
        expect(send).toHaveBeenLastCalledWith(message("second"));
      } else if (action === "clear") {
        act(() => result.current.adapter!.enqueue(message("third")));
        await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
        expect(send).toHaveBeenLastCalledWith(message("third"));
      }
    },
  );

  it("does not append an overtaken steer after unmounting during rollback", async () => {
    vi.useFakeTimers();
    try {
      let finish!: () => void;
      const firstRun = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const send = vi.fn(async (_message: AppendMessage) => {});
      send.mockReturnValueOnce(firstRun);
      const { result, rerender, unmount } = renderHook(
        ({ isRunning }) =>
          useMessageQueue({
            enabled: true,
            isRunning,
            isSendDisabled: false,
            send,
            cancel: async () => {},
            interrupt: () => {},
          }),
        { initialProps: { isRunning: false } },
      );
      await act(async () => result.current.adapter!.enqueue(message("first")));
      expect(send).toHaveBeenCalledOnce();
      rerender({ isRunning: true });
      act(() => result.current.adapter!.steer(message("second")));
      await act(async () => {
        await result.current.cancel();
      });
      rerender({ isRunning: false });
      await act(async () => {
        finish();
        await firstRun;
      });
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      unmount();
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      expect(send).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
});
