// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  anonymousSessionFetch: vi.fn(),
  createVirtualArchive: vi.fn(),
}));

vi.mock("@/lib/anonymous-session-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/anonymous-session-client")>()),
  anonymousSessionFetch: mocks.anonymousSessionFetch,
}));

vi.mock("@/lib/xulux/virtual-archive", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/xulux/virtual-archive")>()),
  createVirtualArchive: mocks.createVirtualArchive,
}));

import { useVirtualArchive } from "./useVirtualArchive";

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("useVirtualArchive", () => {
  it("downloads a hosted archive through the proxy with the browser session", async () => {
    const archive = { files: [] };
    mocks.createVirtualArchive.mockReturnValue(archive);
    mocks.anonymousSessionFetch.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
    );

    const { result } = renderHook(() =>
      useVirtualArchive("https://demo.bl.run/api/download?v=1", "demo", "v1"),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(mocks.anonymousSessionFetch).toHaveBeenCalledWith(
      "/api/xulux/download-proxy?templateId=demo&versionId=v1&downloadSearch=%3Fv%3D1",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("downloads an in-process demo archive without a session", async () => {
    const archive = { files: [] };
    mocks.createVirtualArchive.mockReturnValue(archive);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }));

    const { result } = renderHook(() =>
      useVirtualArchive("/api/xulux/demo-download?slug=chatgpt", "chatgpt"),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/xulux/demo-download?slug=chatgpt",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(mocks.anonymousSessionFetch).not.toHaveBeenCalled();
  });

  it("surfaces a denied download as an error state", async () => {
    mocks.anonymousSessionFetch.mockResolvedValue(
      new Response("limited", { status: 429 }),
    );

    const { result } = renderHook(() =>
      useVirtualArchive("https://demo.bl.run/api/download", "demo"),
    );

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(mocks.createVirtualArchive).not.toHaveBeenCalled();
  });
});
