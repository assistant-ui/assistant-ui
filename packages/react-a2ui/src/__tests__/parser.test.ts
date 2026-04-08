import { describe, it, expect } from "vitest";
import { parseA2uiMessage } from "../protocol/parser";

describe("parseA2uiMessage", () => {
  it("should parse createSurface", () => {
    expect(
      parseA2uiMessage({ type: "createSurface", surfaceId: "s1" }),
    ).toEqual({
      type: "createSurface",
      surfaceId: "s1",
    });
  });

  it("should parse createSurface with metadata", () => {
    expect(
      parseA2uiMessage({
        type: "createSurface",
        surfaceId: "s1",
        metadata: { title: "Booking" },
      }),
    ).toEqual({
      type: "createSurface",
      surfaceId: "s1",
      metadata: { title: "Booking" },
    });
  });

  it("should parse updateComponents", () => {
    const components = [
      { type: "Button", id: "btn-1", props: { label: "Click" } },
    ];
    expect(
      parseA2uiMessage({
        type: "updateComponents",
        surfaceId: "s1",
        components,
      }),
    ).toEqual({ type: "updateComponents", surfaceId: "s1", components });
  });

  it("should parse updateDataModel", () => {
    expect(
      parseA2uiMessage({
        type: "updateDataModel",
        surfaceId: "s1",
        path: "/booking/destination",
        value: "Tokyo",
      }),
    ).toEqual({
      type: "updateDataModel",
      surfaceId: "s1",
      path: "/booking/destination",
      value: "Tokyo",
    });
  });

  it("should parse deleteSurface", () => {
    expect(
      parseA2uiMessage({ type: "deleteSurface", surfaceId: "s1" }),
    ).toEqual({
      type: "deleteSurface",
      surfaceId: "s1",
    });
  });

  it("should return null for missing type", () => {
    expect(parseA2uiMessage({ surfaceId: "s1" })).toBeNull();
  });

  it("should return null for unknown type", () => {
    expect(parseA2uiMessage({ type: "unknown", surfaceId: "s1" })).toBeNull();
  });

  it("should return null for missing surfaceId", () => {
    expect(parseA2uiMessage({ type: "createSurface" })).toBeNull();
  });

  it("should return null for non-object input", () => {
    expect(parseA2uiMessage(null)).toBeNull();
    expect(parseA2uiMessage("string")).toBeNull();
    expect(parseA2uiMessage(42)).toBeNull();
  });

  it("should return null for updateComponents without components array", () => {
    expect(
      parseA2uiMessage({ type: "updateComponents", surfaceId: "s1" }),
    ).toBeNull();
  });

  it("should return null for updateDataModel without path", () => {
    expect(
      parseA2uiMessage({ type: "updateDataModel", surfaceId: "s1", value: 1 }),
    ).toBeNull();
  });
});
