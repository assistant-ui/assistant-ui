import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttachmentThumb } from "./AttachmentThumb";

const h = vi.hoisted(() => ({
  attachment: { name: "" },
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

  const mount = async (name: string) => {
    h.attachment.name = name;
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

  it("renders just a dot when the name has no extension", async () => {
    const el = await mount("noext");
    expect(el.textContent).toBe(".");
  });

  it("renders just a dot for an empty name", async () => {
    const el = await mount("");
    expect(el.textContent).toBe(".");
  });

  it("treats a leading-dot name as an extension", async () => {
    const el = await mount(".gitignore");
    expect(el.textContent).toBe(".gitignore");
  });

  it("forwards props to the underlying Text", async () => {
    h.attachment.name = "photo.png";
    await act(async () => {
      root.render(<AttachmentThumb testID="forwarded" />);
    });
    expect(container.querySelector('[data-testid="forwarded"]')).not.toBeNull();
  });
});
