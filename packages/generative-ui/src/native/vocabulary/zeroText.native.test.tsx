// @vitest-environment jsdom
import { createElement, forwardRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { byRole, cleanupSpecs, renderNativeSpec, spec } from "../testUtils";

const pressables: Record<string, unknown>[] = [];
vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const Pressable = forwardRef((props: Record<string, unknown>, ref) => {
    pressables.push(props);
    return createElement(actual.Pressable, { ...props, ref } as never);
  });
  return { ...actual, Pressable };
});

afterEach(() => {
  cleanupSpecs();
  pressables.length = 0;
});

const options = [
  { label: "A", value: "a" },
  { label: "B", value: "b" },
];

describe("numeric text props on React Native", () => {
  it("renders a zero Card title", () => {
    const { container } = renderNativeSpec(
      spec({ main: { type: "Card", props: { title: 0 } } }),
    );
    expect(byRole(container, "heading").textContent).toBe("0");
  });
  it("renders a zero Alert title and description", () => {
    const { container } = renderNativeSpec(
      spec({ main: { type: "Alert", props: { title: 0, description: 0 } } }),
    );
    expect(byRole(container, "alert").textContent).toBe("00");
  });
  it("shows a zero Select placeholder instead of selecting the first option", () => {
    const { container } = renderNativeSpec(
      spec({ main: { type: "Select", props: { options, placeholder: 0 } } }),
    );
    expect(container.textContent).toContain("0");
    expect(byRole(container, "radio", "A").getAttribute("aria-checked")).toBe(
      "false",
    );
  });
  it.each([["checkbox"], ["switch"]])(
    "names a numeric-label %s with a string",
    (variant) => {
      renderNativeSpec(
        spec({
          main: { type: "Checkbox", props: { label: 105, variant } },
        }),
      );
      const row = pressables.find(
        (props) => props.accessibilityRole === variant,
      );
      expect(row?.accessibilityLabel).toBe("105");
    },
  );
});
