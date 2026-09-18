/**
 * @vitest-environment jsdom
 */
import { act, type Ref } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MessagePrimitiveRoot } from "./MessageRoot";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  setIsHovering: vi.fn(),
}));

vi.mock("@assistant-ui/store", () => ({
  useAui: () => ({ message: { setIsHovering: mocks.setIsHovering } }),
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({ message: { id: "message-1" } }),
}));

vi.mock("../../context/react/ThreadViewportContext", () => ({
  useThreadViewport: () => undefined,
  useThreadViewportStore: () => ({
    getState: () => ({ turnAnchor: "none" }),
  }),
}));

vi.mock("../../utils/Primitive", () => ({
  Primitive: { div: "div" },
}));

vi.mock("radix-ui/internal", () => ({
  useComposedRefs:
    (...refs: Array<Ref<HTMLDivElement> | undefined>) =>
    (node: HTMLDivElement | null) => {
      for (const ref of refs) {
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }
    },
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MessagePrimitiveRoot", () => {
  it("does not restore hover state after unmount", async () => {
    vi.spyOn(HTMLElement.prototype, "matches").mockReturnValue(true);
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => root.render(<MessagePrimitiveRoot />));
    act(() => root.unmount());
    await Promise.resolve();

    expect(mocks.setIsHovering).toHaveBeenLastCalledWith(false);
  });
});
