import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Text } from "react-native";
import { ErrorMessage } from "./ErrorMessage";

const h = vi.hoisted(() => ({
  error: undefined as unknown,
}));

vi.mock("@assistant-ui/core/react", () => ({
  useMessageError: () => h.error,
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("ErrorMessage", () => {
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

  const mount = async (children?: React.ReactNode) => {
    await act(async () => {
      root.render(<ErrorMessage testID="msg">{children}</ErrorMessage>);
    });
    return container.querySelector('[data-testid="msg"]');
  };

  it("renders nothing when there is no error", async () => {
    expect(await mount()).toBeNull();
  });

  it("falls back to String(error) when no children are given", async () => {
    h.error = new Error("boom");
    const el = await mount();
    expect(el?.textContent).toBe("Error: boom");
  });

  it("stringifies a plain string error", async () => {
    h.error = "kaboom";
    const el = await mount();
    expect(el?.textContent).toBe("kaboom");
  });

  it("renders children verbatim instead of the error when provided", async () => {
    h.error = new Error("boom");
    const el = await mount(<Text>custom</Text>);
    expect(el?.textContent).toBe("custom");
    expect(el?.textContent).not.toContain("boom");
  });
});
