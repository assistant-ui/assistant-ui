// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const setIsCopied = vi.fn();
  const initialAui = {
    message: {
      getCopyText: (): string => "Hello",
      setIsCopied,
    },
    composer: {},
  };

  return {
    setIsCopied,
    initialAui,
    currentAui: initialAui,
    state: {
      message: {
        id: "message-1",
        role: "assistant",
        status: { type: "complete", reason: "stop" },
        parts: [{ type: "text", text: "Hello" }],
        isCopied: false,
      },
      composer: {
        isEditing: false,
        text: "",
      },
    },
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => mocks.currentAui,
  useAuiState: (selector: (state: typeof mocks.state) => unknown) =>
    selector(mocks.state),
}));

import { useActionBarCopy } from "./useActionBarCopy";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  mocks.currentAui = mocks.initialAui;
});

it("keeps copied feedback through an unrelated scope change", async () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(() =>
    useActionBarCopy({ copyToClipboard: vi.fn() }),
  );

  result.current.copy();
  await Promise.resolve();
  expect(mocks.setIsCopied).toHaveBeenCalledWith(true);
  mocks.setIsCopied.mockClear();

  const previousAui = mocks.currentAui;
  mocks.currentAui = { ...previousAui, composer: {} };
  rerender();

  expect(mocks.currentAui).not.toBe(previousAui);
  expect(mocks.currentAui.message).toBe(previousAui.message);
  expect(mocks.currentAui.composer).not.toBe(previousAui.composer);
  expect(mocks.setIsCopied).not.toHaveBeenCalledWith(false);
  expect(vi.getTimerCount()).toBe(1);

  await vi.advanceTimersByTimeAsync(3000);
  expect(mocks.setIsCopied).toHaveBeenCalledWith(false);
});

it("reports a pending copy after an unrelated scope change", async () => {
  vi.useFakeTimers();
  let resolveCopy: (() => void) | undefined;
  const copyToClipboard = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveCopy = resolve;
      }),
  );
  const { result, rerender } = renderHook(() =>
    useActionBarCopy({ copyToClipboard }),
  );

  result.current.copy();
  const previousAui = mocks.currentAui;
  mocks.currentAui = { ...previousAui, composer: {} };
  rerender();

  expect(mocks.currentAui).not.toBe(previousAui);
  expect(mocks.currentAui.message).toBe(previousAui.message);
  expect(mocks.currentAui.composer).not.toBe(previousAui.composer);
  resolveCopy?.();
  await Promise.resolve();

  expect(mocks.setIsCopied).toHaveBeenCalledWith(true);
  expect(vi.getTimerCount()).toBe(1);
});

it("resets copied feedback when the message scope changes", async () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(() =>
    useActionBarCopy({ copyToClipboard: vi.fn() }),
  );

  result.current.copy();
  await Promise.resolve();
  mocks.setIsCopied.mockClear();

  mocks.currentAui = {
    ...mocks.currentAui,
    message: {
      getCopyText: (): string => "Next message",
      setIsCopied: vi.fn(),
    },
  };
  rerender();

  expect(mocks.setIsCopied).toHaveBeenCalledWith(false);
  expect(vi.getTimerCount()).toBe(0);
});
