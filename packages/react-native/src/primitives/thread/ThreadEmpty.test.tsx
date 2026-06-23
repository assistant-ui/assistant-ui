import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Text } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThreadEmpty } from "./ThreadEmpty";

const h = vi.hoisted(() => ({
  isEmpty: true,
}));

vi.mock("@assistant-ui/core/react", () => ({
  useThreadIsEmpty: () => h.isEmpty,
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("ThreadEmpty", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.isEmpty = true;

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
        <ThreadEmpty>
          <Text testID="child">visible</Text>
        </ThreadEmpty>,
      );
    });
    return container.querySelector('[data-testid="child"]');
  };

  it("renders children when the thread is empty", async () => {
    h.isEmpty = true;
    expect(await mount()).not.toBeNull();
  });

  it("hides children when the thread is not empty", async () => {
    h.isEmpty = false;
    expect(await mount()).toBeNull();
  });
});
