import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttachmentName } from "./AttachmentName";

const h = vi.hoisted(() => ({
  state: { attachment: { name: "" } },
}));

vi.mock("@assistant-ui/store", () => ({
  useAuiState: <T,>(selector: (s: { attachment: { name: string } }) => T) =>
    selector(h.state),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("AttachmentName", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.state.attachment.name = "";
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

  const mount = async () => {
    await act(async () => {
      root.render(<AttachmentName testID="name" />);
    });
    const el = container.querySelector('[data-testid="name"]');
    expect(el).not.toBeNull();
    return el as HTMLElement;
  };

  it("renders the attachment name from store state", async () => {
    h.state.attachment.name = "report.pdf";
    const el = await mount();
    expect(el.textContent).toBe("report.pdf");
  });

  it("renders a different attachment name", async () => {
    h.state.attachment.name = "photo.png";
    const el = await mount();
    expect(el.textContent).toBe("photo.png");
  });
});
