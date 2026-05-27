import { describe, expect, it } from "vitest";
import {
  generativeUISpecSchema,
  isLeakedRenderGuiText,
  parseRenderGuiResult,
  renderGuiToolResultSchema,
} from "./render-gui-tool";

describe("render-gui-tool", () => {
  it("accepts a valid Card + Button spec", () => {
    const spec = {
      root: {
        component: "Card",
        props: { title: "Welcome" },
        children: [
          {
            component: "Button",
            props: { label: "Get started", variant: "primary" },
          },
        ],
      },
    };

    expect(generativeUISpecSchema.parse(spec)).toEqual(spec);
    expect(
      parseRenderGuiResult(renderGuiToolResultSchema.parse({ spec })),
    ).toEqual(spec);
  });

  it("rejects a spec with empty component name", () => {
    expect(() =>
      generativeUISpecSchema.parse({
        root: { component: "", props: { title: "Bad" } },
      }),
    ).toThrow();
  });

  it("returns undefined for malformed tool results", () => {
    expect(parseRenderGuiResult({ notSpec: true })).toBeUndefined();
    expect(parseRenderGuiResult(null)).toBeUndefined();
  });

  it("detects leaked render_gui tool result text", () => {
    const payload = renderGuiToolResultSchema.parse({
      spec: {
        root: {
          component: "Card",
          children: [{ component: "Text", children: ["Hello"] }],
        },
      },
    });

    expect(isLeakedRenderGuiText(JSON.stringify(payload, null, 2))).toBe(true);
    expect(
      isLeakedRenderGuiText(
        "```json\n" + JSON.stringify(payload, null, 2) + "\n```",
      ),
    ).toBe(true);
    expect(isLeakedRenderGuiText("Here is your card.")).toBe(false);
  });
});
