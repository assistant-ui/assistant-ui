import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageMessagePart } from "@assistant-ui/react";

import { ImageActions, ImagePreview, ImageSource, ImageZoom } from "./image";

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
  it("keeps the default auto framing path", () => {
    const { container } = render(<ImagePreview src="image.png" />);

    expect(
      container.querySelector('[data-slot="image-preview"]')?.className,
    ).toBe("relative min-h-32");
    expect(screen.getByRole("img").className).toContain(
      "block h-auto w-full object-contain",
    );
  });

  it.each([
    ["1:1", "aspect-square"],
    ["4:3", "aspect-[4/3]"],
    ["16:9", "aspect-video"],
    ["9:16", "aspect-[9/16]"],
  ] as const)("adds the %s ratio box class", (ratio, ratioClassName) => {
    const { container } = render(
      <ImagePreview src="image.png" ratio={ratio} />,
    );

    expect(
      container.querySelector('[data-slot="image-preview"]')?.className,
    ).toContain(ratioClassName);
  });

  it("fills a fixed ratio box with the selected fit", () => {
    const { container } = render(
      <ImagePreview src="image.png" ratio="16:9" fit="cover" />,
    );

    expect(screen.getByRole("img").className).toContain(
      "block h-full w-full object-cover",
    );
    expect(
      container.querySelector('[data-slot="image-preview-loading"]')?.className,
    ).toContain("absolute inset-0");

    fireEvent.error(screen.getByRole("img"));

    expect(
      container.querySelector('[data-slot="image-preview-error"]')?.className,
    ).toContain("absolute inset-0");
  });

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

describe("ImageSource", () => {
  it("links a source label with a safe URL", () => {
    render(
      <ImageSource label="Example reference" url="https://example.com/page" />,
    );

    const link = screen.getByRole("link", {
      name: /Example reference.*opens in a new tab/,
    });
    expect(link.getAttribute("href")).toBe("https://example.com/page");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("renders a source label as text when its URL is unsafe", () => {
    render(<ImageSource label="Example reference" url="javascript:alert(1)" />);

    expect(screen.getByText("Example reference")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows an icon URL or an initial fallback", () => {
    const { container, rerender } = render(
      <ImageSource label="Example" iconUrl="https://example.com/favicon.png" />,
    );

    expect(
      container.querySelector('[data-slot="image-source-icon"]'),
    ).toBeTruthy();

    rerender(<ImageSource label="Example" />);

    expect(
      container.querySelector('[data-slot="image-source-icon-fallback"]')
        ?.textContent,
    ).toBe("E");
  });

  it("uses the URL host when a source has no label", () => {
    render(<ImageSource url="https://www.example.com/page" />);

    expect(screen.getByText("example.com")).toBeTruthy();
  });

  it("renders nothing without a label or a displayable host", () => {
    const { container } = render(<ImageSource url="javascript:alert(1)" />);

    expect(container.innerHTML).toBe("");
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

  it("preserves non-UTF-8 bytes in a percent-encoded image", async () => {
    renderActions("data:image/png,%89PNG%0D%0A%1A%0A");

    const blob = await downloadedBlob();
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
  });

  it("uses a same-origin image URL's basename for the default download filename", () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    try {
      renderActions("/photos/photo.jpg?size=large");
      fireEvent.click(screen.getByLabelText("Download image"));

      expect(click).toHaveBeenCalledOnce();
      expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe(
        "photo.jpg",
      );
    } finally {
      click.mockRestore();
    }
  });

  it("keeps the image extension when a URL basename has a non-UTF-8 escape", () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    try {
      renderActions("/photos/%89photo.jpg");
      fireEvent.click(screen.getByLabelText("Download image"));

      expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe(
        "%89photo.jpg",
      );
    } finally {
      click.mockRestore();
    }
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

  it("decodes percent-encoded base64 payloads", async () => {
    renderActions("data:image/png;base64,aGVsbG8%3D");

    const blob = await downloadedBlob();
    expect(await blob.text()).toBe("hello");
  });

  it("ignores malformed base64 downloads", () => {
    renderActions("data:image/png;base64,%%%invalid%%%");

    expect(() =>
      fireEvent.click(screen.getByLabelText("Download image")),
    ).not.toThrow();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("ignores malformed base64 copies", async () => {
    renderActions("data:image/png;base64,%%%invalid%%%");

    fireEvent.click(screen.getByLabelText("Copy image"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(clipboardWrite).not.toHaveBeenCalled();
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

  it("opens the preview with Enter and Space", async () => {
    const trigger = renderZoom();
    trigger.focus();

    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(
      await screen.findByRole("dialog", { name: "Zoomed image" }),
    ).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();

    trigger.focus();
    const spaceKeyDown = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: " ",
    });
    trigger.dispatchEvent(spaceKeyDown);
    expect(spaceKeyDown.defaultPrevented).toBe(true);

    fireEvent.keyUp(trigger, { key: " " });
    expect(
      await screen.findByRole("dialog", { name: "Zoomed image" }),
    ).toBeTruthy();
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
