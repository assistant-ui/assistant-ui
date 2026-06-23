import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BranchPickerCount } from "./BranchPickerCount";

const h = vi.hoisted(() => ({
  state: { message: { branchCount: 0 } },
}));

vi.mock("@assistant-ui/store", () => ({
  useAuiState: <T,>(selector: (s: { message: { branchCount: number } }) => T) =>
    selector(h.state),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("BranchPickerCount", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.state.message.branchCount = 0;
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
      root.render(<BranchPickerCount testID="count" />);
    });
    const el = container.querySelector('[data-testid="count"]');
    expect(el).not.toBeNull();
    return el as HTMLElement;
  };

  it("renders the branchCount from store state", async () => {
    h.state.message.branchCount = 3;
    const el = await mount();
    expect(el.textContent).toBe("3");
  });

  it("renders a different branchCount value", async () => {
    h.state.message.branchCount = 12;
    const el = await mount();
    expect(el.textContent).toBe("12");
  });
});
