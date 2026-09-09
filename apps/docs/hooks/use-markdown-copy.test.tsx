// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMarkdownCopy } from "./use-markdown-copy";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("useMarkdownCopy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
});
