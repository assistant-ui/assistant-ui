import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Text } from "react-native";
import { ErrorRoot } from "./ErrorRoot";

const h = vi.hoisted(() => ({
  error: undefined as unknown,
}));

vi.mock("@assistant-ui/core/react", () => ({
  useMessageError: () => h.error,
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("ErrorRoot", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.error = undefined;
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
      root.render(
        <ErrorRoot testID="root">
          <Text testID="child">child</Text>
        </ErrorRoot>,
      );
    });
  };

  it("renders nothing when there is no error", async () => {
    await mount();
    expect(container.querySelector('[data-testid="root"]')).toBeNull();
    expect(container.querySelector('[data-testid="child"]')).toBeNull();
  });

  it("renders the view with children once an error is present", async () => {
    h.error = new Error("boom");
    await mount();
    expect(container.querySelector('[data-testid="root"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="child"]')?.textContent).toBe(
      "child",
    );
  });

  it("treats a falsy-but-defined error as present", async () => {
    h.error = "";
    await mount();
    expect(container.querySelector('[data-testid="root"]')).not.toBeNull();
  });
});
