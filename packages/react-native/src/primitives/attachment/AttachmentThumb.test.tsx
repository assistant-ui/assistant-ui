import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttachmentThumb } from "./AttachmentThumb";

const h = vi.hoisted(() => ({
  attachment: { name: "", type: "file" },
}));

vi.mock("@assistant-ui/store", () => ({
  useAuiState: <T,>(selector: (s: { attachment: typeof h.attachment }) => T) =>
    selector({ attachment: h.attachment }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("AttachmentThumb", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.attachment.name = "";
    h.attachment.type = "file";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const mount = async (name: string, type = "file") => {
    h.attachment.name = name;
    h.attachment.type = type;
    await act(async () => {
      root.render(<AttachmentThumb testID="thumb" />);
    });
    return container.querySelector('[data-testid="thumb"]') as HTMLElement;
  };

  it("renders the dotted extension for a single-extension name", async () => {
    const el = await mount("photo.png");
    expect(el.textContent).toBe(".png");
  });

  it("takes only the last segment for a multi-extension name", async () => {
    const el = await mount("archive.tar.gz");
    expect(el.textContent).toBe(".gz");
  });

  it("falls back to the attachment type when the name has no extension", async () => {
    const el = await mount("noext", "document");
    expect(el.textContent).toBe("document");
  });

  it("falls back to the attachment type for an empty name", async () => {
    const el = await mount("", "image");
    expect(el.textContent).toBe("image");
  });

  it("treats a leading-dot name as extensionless", async () => {
    const el = await mount(".gitignore");
    expect(el.textContent).toBe("file");
  });

  it("falls back to the attachment type for a trailing-dot name", async () => {
    const el = await mount("report.", "image");
    expect(el.textContent).toBe("image");
  });

  it("forwards props to the underlying Text", async () => {
    h.attachment.name = "photo.png";
    await act(async () => {
      root.render(<AttachmentThumb testID="forwarded" />);
    });
    expect(container.querySelector('[data-testid="forwarded"]')).not.toBeNull();
  });
});
