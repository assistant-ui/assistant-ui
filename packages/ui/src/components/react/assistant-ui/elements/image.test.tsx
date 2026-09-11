import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageMessagePart } from "@assistant-ui/react";

import { ImageActions, ImagePreview, ImageZoom } from "./image";

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
const originalImageCompleteDescriptor = Object.getOwnPropertyDescriptor(
  HTMLImageElement.prototype,
  "complete",
);
const originalImageNaturalWidthDescriptor = Object.getOwnPropertyDescriptor(
  HTMLImageElement.prototype,
  "naturalWidth",
);

const setImageState = (complete: boolean, naturalWidth: number) => {
  Object.defineProperty(HTMLImageElement.prototype, "complete", {
    configurable: true,
    value: complete,
  });
  Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", {
    configurable: true,
    value: naturalWidth,
  });
};

const restoreImageDescriptor = (
  property: "complete" | "naturalWidth",
  descriptor: PropertyDescriptor | undefined,
) => {
  if (descriptor) {
    Object.defineProperty(HTMLImageElement.prototype, property, descriptor);
  } else {
    Reflect.deleteProperty(HTMLImageElement.prototype, property);
  }
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  restoreImageDescriptor("complete", originalImageCompleteDescriptor);
  restoreImageDescriptor("naturalWidth", originalImageNaturalWidthDescriptor);
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "clipboard");
  }
});

describe("ImagePreview loading states", () => {
  it("shows the error state when a failed image completed before hydration", async () => {
    setImageState(true, 0);
    render(<ImagePreview src="https://example.test/missing.png" />);

    await waitFor(() =>
      expect(
        document.querySelector('[data-slot="image-preview-error"]'),
      ).not.toBeNull(),
    );
    expect(
      document.querySelector('[data-slot="image-preview-loading"]'),
    ).toBeNull();
  });

  it("shows a completed image that loaded before hydration", async () => {
    setImageState(true, 640);
    render(<ImagePreview src="https://example.test/image.png" />);

    await waitFor(() =>
      expect(
        document.querySelector('[data-slot="image-preview-loading"]'),
      ).toBeNull(),
    );
    expect(screen.getByRole("img").className).not.toContain("invisible");
  });

  it("updates from loading when the image load event fires", () => {
    const onLoad = vi.fn();
    render(<ImagePreview src="image.png" onLoad={onLoad} />);

    fireEvent.load(screen.getByRole("img"));

    expect(onLoad).toHaveBeenCalledOnce();
    expect(
      document.querySelector('[data-slot="image-preview-loading"]'),
    ).toBeNull();
  });

  it("updates to the error state when the image error event fires", () => {
    const onError = vi.fn();
    render(<ImagePreview src="missing.png" onError={onError} />);

    fireEvent.error(screen.getByRole("img"));

    expect(onError).toHaveBeenCalledOnce();
    expect(
      document.querySelector('[data-slot="image-preview-error"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-slot="image-preview-loading"]'),
    ).toBeNull();
  });

  it("does not carry a loaded state to a new source", () => {
    const { rerender } = render(<ImagePreview src="first.png" />);
    fireEvent.load(screen.getByRole("img"));

    rerender(<ImagePreview src="second.png" />);

    expect(
      document.querySelector('[data-slot="image-preview-loading"]'),
    ).not.toBeNull();
    expect(screen.getByRole("img").className).toContain("invisible");
  });
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

describe("ImageActions regeneration", () => {
  it("handles rejected regeneration callbacks", async () => {
    const rejection = new Error("regeneration failed");
    const unhandled: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      const part = {
        type: "image",
        image: "data:image/png;base64,aGVsbG8=",
        prompt: "hello",
      } as ImageMessagePart;
      render(
        <ImageActions
          part={part}
          onRegenerate={() => Promise.reject(rejection)}
        />,
      );

      fireEvent.click(screen.getByLabelText("Regenerate image"));

      expect(
        (screen.getByLabelText("Regenerate image") as HTMLButtonElement)
          .disabled,
      ).toBe(true);
      await waitFor(() =>
        expect(
          (screen.getByLabelText("Regenerate image") as HTMLButtonElement)
            .disabled,
        ).toBe(false),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }
  });
});

describe("ImageZoom modal behavior", () => {
  const renderZoom = () => {
    render(
      <>
        <button type="button">Outside</button>
        <ImageZoom src="image.png" alt="Mountain landscape">
          <span>Thumbnail</span>
        </ImageZoom>
      </>,
    );

    return screen.getByRole("button", { name: "Click to zoom image" });
  };

  const openZoom = async () => {
    const trigger = renderZoom();
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", {
      name: "Zoomed image",
    });
    const closeButton = screen.getByRole("button", {
      name: "Close zoomed image",
    });
    await waitFor(() => expect(document.activeElement).toBe(closeButton));
    return { trigger, dialog, closeButton };
  };

  it("exposes dialog semantics, focuses close, and restores trigger focus", async () => {
    const { trigger, dialog, closeButton } = await openZoom();

    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(closeButton);

    fireEvent.click(closeButton);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps Tab focus inside the dialog and restores focus on Escape", async () => {
    const { trigger, closeButton } = await openZoom();

    const tabEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Tab",
    });
    document.dispatchEvent(tabEvent);

    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(closeButton);

    const reverseTabEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Tab",
      shiftKey: true,
    });
    document.dispatchEvent(reverseTabEvent);

    expect(reverseTabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("restores focus after backdrop and image dismissal", async () => {
    const { trigger, dialog } = await openZoom();

    fireEvent.click(dialog);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    const image = await screen.findByRole("img", {
      name: "Mountain landscape",
    });
    fireEvent.click(image);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
