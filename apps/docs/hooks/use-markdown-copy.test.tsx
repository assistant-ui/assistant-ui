// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { useMarkdownCopy } from "./use-markdown-copy";

const { toastMock } = vi.hoisted(() => ({
  toastMock: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("sonner", async (importOriginal) => ({
  ...(await importOriginal<typeof import("sonner")>()),
  toast: toastMock,
}));

describe("useMarkdownCopy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document, "execCommand");
  });

  it("fetches again when the platform-specific URL changes", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => ({
      ok: true,
      text: async () => `Content for ${String(input)}`,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(({ url }) => useMarkdownCopy(url), {
      initialProps: { url: "/docs/example.md" },
    });

    act(() => result.current.prefetch());
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/docs/example.md"),
    );

    rerender({ url: "/docs/example.md?platform=rn" });
    act(() => result.current.prefetch());
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/docs/example.md?platform=rn"),
    );
  });

  it("copies only the current platform through the clipboard fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => ({
        ok: true,
        text: async () => `Content for ${String(input)}`,
      })),
    );
    vi.stubGlobal("navigator", {});
    const execCommand = vi.fn(() => {
      expect(document.querySelector("textarea")?.value).toBe(
        "Content for /docs/example.md?platform=rn",
      );
      return true;
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });
    const { result, rerender } = renderHook(({ url }) => useMarkdownCopy(url), {
      initialProps: { url: "/docs/example.md" },
    });

    act(() => result.current.prefetch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender({ url: "/docs/example.md?platform=rn" });
    act(() => result.current.copy());
    expect(execCommand).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Content not loaded yet");

    act(() => result.current.prefetch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.copy());
    expect(execCommand).toHaveBeenCalledWith("copy");
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Copied to clipboard"),
    );
    expect(document.querySelector("textarea")).toBeNull();
  });
});
