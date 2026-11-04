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
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Copied to clipboard"),
    );
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(toast.error).not.toHaveBeenCalled();
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("retries a failed prefetch when copying and reuses the loaded Markdown", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Unavailable", { status: 500 }))
      .mockResolvedValueOnce(new Response("# Overview"));
    vi.stubGlobal("fetch", fetchMock);
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { result } = renderHook(() => useMarkdownCopy("/docs.md"));

    act(() => result.current.prefetch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(toast.error).not.toHaveBeenCalled();

    act(() => result.current.copy());
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("# Overview"));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/docs.md");
    expect(toast.success).toHaveBeenCalledWith("Copied to clipboard");

    act(() => result.current.copy());
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("waits for an in-flight prefetch before copying without another request", async () => {
    let finish!: (response: Response) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { result } = renderHook(() => useMarkdownCopy("/docs.md"));

    act(() => result.current.prefetch());
    act(() => result.current.copy());
    expect(result.current.isLoading).toBe(true);
    expect(writeText).not.toHaveBeenCalled();

    await act(async () => finish(new Response("# Overview")));
    expect(writeText).toHaveBeenCalledWith("# Overview");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("reports a failed Markdown request and permits another copy attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(new Response("# Overview"));
    vi.stubGlobal("fetch", fetchMock);
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { result } = renderHook(() => useMarkdownCopy("/docs.md"));

    act(() => result.current.copy());
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to load Markdown. Please try again.",
      ),
    );
    expect(result.current.isLoading).toBe(false);
    expect(writeText).not.toHaveBeenCalled();

    act(() => result.current.copy());
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("# Overview"));
    expect(toast.success).toHaveBeenCalledWith("Copied to clipboard");
  });
});
