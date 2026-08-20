import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageMessagePart } from "@assistant-ui/react";

import { ImageActions } from "./image";

class FakeClipboardItem {
  constructor(public readonly items: Record<string, Blob>) {}
}

const clipboardWrite = vi.fn<(items: FakeClipboardItem[]) => Promise<void>>();
const createdBlobs: Blob[] = [];

const renderActions = (image: string) => {
  const part = { type: "image", image } as ImageMessagePart;
  render(<ImageActions part={part} />);
};

const downloadedBlob = async (): Promise<Blob> => {
  fireEvent.click(screen.getByLabelText("Download image"));
  await waitFor(() => expect(createdBlobs.length).toBeGreaterThan(0));
  return createdBlobs[0]!;
};

const copiedBlob = async (): Promise<Blob> => {
  fireEvent.click(screen.getByLabelText("Copy image"));
  await waitFor(() => expect(clipboardWrite).toHaveBeenCalled());
  const item = clipboardWrite.mock.calls[0]![0]![0]!;
  const blob = Object.values(item.items)[0];
  expect(blob).toBeDefined();
  return blob!;
};

beforeEach(() => {
  clipboardWrite.mockReset().mockResolvedValue(undefined);
  createdBlobs.length = 0;
  vi.stubGlobal("ClipboardItem", FakeClipboardItem);
  Object.defineProperty(navigator, "clipboard", {
    value: { write: clipboardWrite },
    configurable: true,
  });
  URL.createObjectURL = vi.fn((blob: Blob) => {
    createdBlobs.push(blob);
    return "blob:fake";
  });
  URL.revokeObjectURL = vi.fn();
});

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard",
);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "clipboard");
  }
});

describe("ImageActions data URI handling", () => {
  const svgPayload =
    "<svg xmlns='http://www.w3.org/2000/svg'><path d='M0,0 L10,10'/></svg>";

  it("downloads the full non-base64 payload even when it contains commas", async () => {
    renderActions(`data:image/svg+xml,${svgPayload}`);

    const blob = await downloadedBlob();
    expect(await blob.text()).toBe(svgPayload);
    expect(blob.type).toBe("image/svg+xml");
  });

  it("copies the full non-base64 payload even when it contains commas", async () => {
    renderActions(`data:image/svg+xml,${svgPayload}`);

    const blob = await copiedBlob();
    expect(await blob.text()).toBe(svgPayload);
  });

  it("percent-decodes an encoded non-base64 payload", async () => {
    renderActions(
      "data:image/svg+xml,%3Csvg%3E%3Cpath d='M0,0%2C1'/%3E%3C/svg%3E",
    );

    const blob = await downloadedBlob();
    expect(await blob.text()).toBe("<svg><path d='M0,0,1'/></svg>");
  });

  it("passes through a payload with an invalid percent escape instead of throwing", async () => {
    const payload = "<svg><text>100% width</text></svg>";
    renderActions(`data:image/svg+xml,${payload}`);

    const blob = await downloadedBlob();
    expect(await blob.text()).toBe(payload);
  });

  it("percent-decodes valid sequences even when a bare percent is present", async () => {
    renderActions(
      "data:image/svg+xml,%3Csvg%3E%3Ctext%3E100% width%3C/text%3E%3C/svg%3E",
    );

    const blob = await downloadedBlob();
    expect(await blob.text()).toBe("<svg><text>100% width</text></svg>");
  });

  it("decodes a base64 payload unchanged", async () => {
    renderActions(`data:image/png;base64,${btoa("hello")}`);

    const blob = await downloadedBlob();
    expect(await blob.text()).toBe("hello");
    expect(blob.type).toBe("image/png");
  });
});
