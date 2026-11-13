// @vitest-environment jsdom

import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessagePrimitiveRoot } from "./MessageRoot";

const mocks = vi.hoisted(() => ({
  message: {
    id: "message-1",
    setIsHovering: vi.fn(),
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => ({ message: mocks.message }),
  useAuiState: (
    selector: (state: { message: typeof mocks.message }) => unknown,
  ) => selector({ message: mocks.message }),
}));

vi.mock(
  "../../context/react/ThreadViewportContext",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../context/react/ThreadViewportContext")
    >()),
    useThreadViewportStore: () => ({
      getState: () => ({ turnAnchor: "bottom" }),
    }),
  }),
);

describe("MessagePrimitiveRoot hover listeners", () => {
  beforeEach(() => {
    let throwOnNextUpdate = true;
    mocks.message = {
      id: "recreated-message",
      setIsHovering: vi.fn(() => {
        if (throwOnNextUpdate) {
          throwOnNextUpdate = false;
          throw new Error("Resource updated before mount");
        }
      }),
    };
  });

  it.each([
    ["mouseenter", true],
    ["mouseleave", false],
  ] as const)(
    "ignores %s when the message resource has not mounted",
    (eventType, value) => {
      const view = render(<MessagePrimitiveRoot />);
      const root = view.container.querySelector(
        "[data-message-id='recreated-message']",
      );
      expect(root).not.toBeNull();

      expect(() => {
        if (eventType === "mouseenter") {
          fireEvent.mouseEnter(root!);
        } else {
          fireEvent.mouseLeave(root!);
        }
      }).not.toThrow();
      expect(mocks.message.setIsHovering).toHaveBeenCalledWith(value);
    },
  );
});
