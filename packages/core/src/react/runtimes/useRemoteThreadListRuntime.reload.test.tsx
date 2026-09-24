// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { makeAdapter } from "../../tests/remote-thread-list-test-helpers";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";

const EMPTY_MESSAGES: readonly never[] = [];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useRemoteThreadListRuntime reload", () => {
  it.each([
    { status: "regular", visited: false },
    { status: "regular", visited: true },
    { status: "archived", visited: false },
  ] as const)(
    "hides a thread the reloaded list no longer returns and still opens it ($status, visited before the reload: $visited)",
    async ({ status, visited }) => {
      const error = vi.spyOn(console, "error");
      let calls = 0;
      const adapter = makeAdapter({
        list: vi.fn(async () => {
          calls++;
          return calls === 1
            ? {
                threads: [
                  { status: "regular" as const, remoteId: "t1" },
                  { status, remoteId: "t2" },
                ],
              }
            : { threads: [{ status: "regular" as const, remoteId: "t1" }] };
        }),
      });
      const runtimeRef: { current: AssistantRuntime | null } = {
        current: null,
      };
      const useThreadRuntime = () =>
        useExternalStoreRuntime({
          messages: EMPTY_MESSAGES,
          onNew: async () => {},
        } as never);

      const App = () => {
        const runtime = useRemoteThreadListRuntime({
          adapter,
          runtimeHook: useThreadRuntime,
        });
        runtimeRef.current = runtime;
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            {null}
          </AssistantRuntimeProvider>
        );
      };

      render(<App />);
      const threads = () => runtimeRef.current!.threads;
      await waitFor(() =>
        expect(Object.keys(threads().getState().threadItems)).toContain("t2"),
      );
      if (visited) {
        await act(() => threads().switchToThread("t2"));
        await act(() => threads().switchToThread("t1"));
      }

      await act(() => threads().reload());

      expect(threads().getState().threadIds).toEqual(["t1"]);
      expect(Object.keys(threads().getState().threadItems)).not.toContain("t2");
      if (visited) {
        await expect(threads().getItemById("t2").archive()).rejects.toThrow(
          'Thread "t2" not found while archiving it.',
        );
      } else {
        expect(() => threads().getItemById("t2")).toThrow();
      }

      await act(() => threads().switchToThread("t2"));

      await waitFor(() =>
        expect(threads().mainItem.getState().remoteId).toBe("t2"),
      );
      expect(threads().getItemById("t2").getState()).toMatchObject({
        isMain: true,
        status: "regular",
      });
      expect(adapter.unarchive).toHaveBeenCalledTimes(
        status === "archived" ? 1 : 0,
      );
      expect(adapter.archive).not.toHaveBeenCalled();
      expect(adapter.fetch).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    },
  );

  it("remounts the provider over a visited thread the reload hid without throwing", async () => {
    const error = vi.spyOn(console, "error");
    let calls = 0;
    const adapter = makeAdapter({
      list: vi.fn(async () => {
        calls++;
        return {
          threads: [
            { status: "regular" as const, remoteId: "t1" },
            ...(calls === 1
              ? [{ status: "regular" as const, remoteId: "t2" }]
              : []),
          ],
        };
      }),
    });
    const runtimeRef: { current: AssistantRuntime | null } = {
      current: null,
    };
    const useThreadRuntime = () =>
      useExternalStoreRuntime({
        messages: EMPTY_MESSAGES,
        onNew: async () => {},
      } as never);

    const App = ({ mounted }: { mounted: boolean }) => {
      const runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: useThreadRuntime,
      });
      runtimeRef.current = runtime;
      return (
        mounted && (
          <AssistantRuntimeProvider runtime={runtime}>
            {null}
          </AssistantRuntimeProvider>
        )
      );
    };

    const { rerender } = render(<App mounted />);
    const threads = () => runtimeRef.current!.threads;
    await waitFor(() =>
      expect(Object.keys(threads().getState().threadItems)).toContain("t2"),
    );
    await act(() => threads().switchToThread("t2"));
    await act(() => threads().switchToThread("t1"));
    await act(() => threads().reload());

    rerender(<App mounted={false} />);
    rerender(<App mounted />);

    expect(threads().getById("t2").getState().isRunning).toBe(false);
    expect(threads().getItemById("t2").getState().isMain).toBe(false);
    expect(Object.keys(threads().getState().threadItems)).not.toContain("t2");
    await expect(threads().getItemById("t2").archive()).rejects.toThrow(
      'Thread "t2" not found while archiving it.',
    );
    expect(adapter.archive).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
