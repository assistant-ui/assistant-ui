import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAttachmentSrc } from "./use-attachment-src";

const mockState = vi.hoisted(() => ({
  current: { attachment: { type: "document" } } as any,
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAuiState: (selector: (s: any) => unknown) => selector(mockState.current),
}));

const makeFile = (name: string) =>
  new File(["content"], name, { type: "image/png" });

describe("useAttachmentSrc", () => {
  let created: string[];
  let revoked: string[];

  beforeEach(() => {
    created = [];
    revoked = [];
    let counter = 0;
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => {
        const url = `blob:mock-${counter++}`;
        created.push(url);
        return url;
      }),
      revokeObjectURL: vi.fn((url: string) => {
        revoked.push(url);
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns undefined for a non-image attachment", () => {
    mockState.current = { attachment: { type: "document" } };
    const { result } = renderHook(() => useAttachmentSrc());
    expect(result.current).toBeUndefined();
    expect(created).toHaveLength(0);
  });

  it("returns the remote image content src when no file is present", () => {
    mockState.current = {
      attachment: {
        type: "image",
        content: [{ type: "image", image: "https://example.com/a.png" }],
      },
    };
    const { result } = renderHook(() => useAttachmentSrc());
    expect(result.current).toBe("https://example.com/a.png");
    expect(created).toHaveLength(0);
  });

  it("creates an object URL for a file preview", () => {
    mockState.current = {
      attachment: { type: "image", file: makeFile("a.png") },
    };
    const { result } = renderHook(() => useAttachmentSrc());
    expect(result.current).toBe(created[0]);
    expect(revoked).toHaveLength(0);
  });

  it("never renders the previous object URL after the file is replaced", () => {
    mockState.current = {
      attachment: { type: "image", file: makeFile("a.png") },
    };
    const rendered: (string | undefined)[] = [];
    const { result, rerender } = renderHook(() => {
      const value = useAttachmentSrc();
      rendered.push(value);
      return value;
    });
    const firstUrl = created[0]!;
    expect(result.current).toBe(firstUrl);

    const sliceStart = rendered.length;
    mockState.current = {
      attachment: { type: "image", file: makeFile("b.png") },
    };
    act(() => {
      rerender();
    });

    expect(result.current).toBe(created[1]);
    expect(rendered.slice(sliceStart)).not.toContain(firstUrl);
    expect(revoked).toEqual([firstUrl]);
  });

  it("renders only the live URL under StrictMode double effect mounting", () => {
    mockState.current = {
      attachment: { type: "image", file: makeFile("a.png") },
    };
    const rendered: (string | undefined)[] = [];
    const { result } = renderHook(
      () => {
        const value = useAttachmentSrc();
        rendered.push(value);
        return value;
      },
      { wrapper: StrictMode },
    );

    expect(created.length).toBeGreaterThanOrEqual(2);
    const liveUrl = created[created.length - 1]!;
    expect(result.current).toBe(liveUrl);
    for (const url of revoked) {
      expect(rendered).not.toContain(url);
    }
  });

  it("revokes the object URL on unmount", () => {
    mockState.current = {
      attachment: { type: "image", file: makeFile("a.png") },
    };
    const { unmount } = renderHook(() => useAttachmentSrc());
    const url = created[0]!;
    unmount();
    expect(revoked).toEqual([url]);
  });
});
