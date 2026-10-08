import { describe, expect, it } from "vitest";
import { surfaceToPresentToolCall } from "./present";
import { A2UI_SURFACE_ID, type A2uiSurfaceState } from "./types";

describe("surfaceToPresentToolCall", () => {
  it("projects a convertible surface into a present tool call", () => {
    const surface: A2uiSurfaceState = {
      components: new Map([
        ["root", { id: "root", component: "Text", text: "Hello" }],
      ]),
      dataModel: undefined,
    };

    const { toolCall, warnings } = surfaceToPresentToolCall(
      "surface-1",
      surface,
    );

    expect(warnings).toEqual([]);
    expect(toolCall).toEqual({
      toolCallId: "a2ui:surface-1",
      toolName: "present",
      args: { $type: "Markdown", value: "Hello" },
      argsText: JSON.stringify({ $type: "Markdown", value: "Hello" }),
      result: {},
      artifact: {
        a2ui: [
          { version: "v0.9", createSurface: { surfaceId: "surface-1" } },
          {
            version: "v0.9",
            updateComponents: {
              surfaceId: "surface-1",
              components: [{ id: "root", component: "Text", text: "Hello" }],
            },
          },
        ],
      },
    });
  });

  it("names the requested surface in the artifact over a stored id", () => {
    const surface: A2uiSurfaceState = {
      components: new Map([
        ["root", { id: "root", component: "Text", text: "Hello" }],
      ]),
      dataModel: undefined,
    };
    Object.defineProperty(surface, A2UI_SURFACE_ID, { value: "stored" });

    const { toolCall } = surfaceToPresentToolCall("surface-1", surface);

    expect(toolCall?.toolCallId).toBe("a2ui:surface-1");
    expect(toolCall?.artifact.a2ui).toMatchObject([
      { createSurface: { surfaceId: "surface-1" } },
      { updateComponents: { surfaceId: "surface-1" } },
    ]);
  });

  it("omits the tool call when the surface has no spec", () => {
    const surface: A2uiSurfaceState = {
      components: new Map(),
      dataModel: undefined,
    };

    expect(surfaceToPresentToolCall("empty", surface)).toEqual({
      toolCall: undefined,
      warnings: expect.any(Array),
    });
  });
});
