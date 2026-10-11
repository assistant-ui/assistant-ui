// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { byRole, cleanupSpecs, renderNativeSpec, spec } from "../testUtils";

afterEach(cleanupSpecs);

describe("text vocabulary on React Native", () => {
  it("renders a Header as a heading at its size", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "Col", props: {}, children: ["a", "b"] },
        a: { type: "Header", props: { text: "Plain" } },
        b: { type: "Header", props: { text: "Large", size: "3xl" } },
      }),
    );
    expect(byRole(container, "heading", "Plain").style.fontSize).toBe("18px");
    const large = byRole(container, "heading", "Large");
    expect([large.style.fontSize, large.style.letterSpacing]).toEqual([
      "36px",
      "-0.72px",
    ]);
  });

  it("maps Text size, weight, and color tokens", () => {
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Text",
          props: {
            value: "Hi",
            size: "sm",
            weight: "bold",
            color: "secondary",
          },
        },
      }),
    );
    const text = container.firstElementChild as HTMLElement;
    expect(text.textContent).toBe("Hi");
    expect([
      text.style.fontSize,
      text.style.lineHeight,
      text.style.fontWeight,
      text.style.color,
    ]).toEqual(["12px", "18px", "700", "rgba(10, 10, 10, 0.62)"]);
  });

  it("follows a tinted Card's white text", () => {
    const { container } = renderNativeSpec(
      spec({
        main: {
          type: "Card",
          props: { background: "#123456" },
          children: ["text", "caption"],
        },
        text: { type: "Text", props: { value: "Body", color: "secondary" } },
        caption: { type: "Caption", props: { value: "Note" } },
      }),
    );
    const [text, caption] = [
      ...container.querySelectorAll<HTMLElement>("[dir]"),
    ];
    expect(text!.style.color).toBe("rgba(255, 255, 255, 0.62)");
    expect(caption!.style.color).toBe("rgba(255, 255, 255, 0.62)");
  });

  it("places children beside the text rather than inside it", () => {
    const { container } = renderNativeSpec(
      spec({
        main: { type: "Text", props: { value: "Total" }, children: ["badge"] },
        badge: { type: "Badge", props: { value: "New" } },
      }),
    );
    const row = container.firstElementChild as HTMLElement;
    const [text, badge] = [...row.children] as HTMLElement[];
    expect(row.style.flexDirection || getComputedStyle(row).flexDirection).toBe(
      "row",
    );
    expect(text!.textContent).toBe("Total");
    expect(badge!.textContent).toBe("New");
  });
});
