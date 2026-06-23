import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BranchPickerNumber } from "./BranchPickerNumber";

const h = vi.hoisted(() => ({
  state: { message: { branchNumber: 0 } },
}));

vi.mock("@assistant-ui/store", () => ({
  useAuiState: <T,>(
    selector: (s: { message: { branchNumber: number } }) => T,
  ) => selector(h.state),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("BranchPickerNumber", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.state.message.branchNumber = 0;
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
      root.render(<BranchPickerNumber testID="number" />);
    });
    const el = container.querySelector('[data-testid="number"]');
    expect(el).not.toBeNull();
    return el as HTMLElement;
  };

  it("renders the branchNumber from store state", async () => {
    h.state.message.branchNumber = 1;
    const el = await mount();
    expect(el.textContent).toBe("1");
  });

  it("renders a different branchNumber value", async () => {
    h.state.message.branchNumber = 7;
    const el = await mount();
    expect(el.textContent).toBe("7");
  });
});
