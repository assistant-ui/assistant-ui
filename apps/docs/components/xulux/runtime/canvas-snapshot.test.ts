import { describe, expect, it } from "vitest";
import {
  fromCanvasSnapshot,
  toCanvasSnapshot,
  type XuluxCanvasState,
} from "./canvas-snapshot";
import type { XuluxCanvasSnapshot } from "./types";

describe("fromCanvasSnapshot", () => {
  it("returns an empty canvas when nothing was persisted", () => {
    expect(fromCanvasSnapshot(undefined)).toEqual({
      status: "empty",
      url: null,
      source: null,
      error: null,
    });
  });

  it("drops legacy sandbox snapshots that point at destroyed previews", () => {
    const legacy: XuluxCanvasSnapshot = {
      status: "ready",
      url: "https://xulux-abc.bl.run",
      source: "refresh",
      error: null,
    };

    const restored = fromCanvasSnapshot(legacy);

    expect(restored.url).toBeNull();
    expect(restored.source).toBeNull();
    expect(restored.status).toBe("empty");
  });

  it("restores a template snapshot with its optional fields", () => {
    const snapshot: XuluxCanvasSnapshot = {
      status: "ready",
      url: "/templates/preview",
      source: "agent_template",
      error: null,
      downloadUrl: "/api/xulux/download-proxy?id=abc",
      templateId: "abc",
      versionId: "v2",
      title: "Support agent",
    };

    expect(fromCanvasSnapshot(snapshot)).toEqual({
      status: "ready",
      url: "/templates/preview",
      source: "agent_template",
      error: null,
      downloadUrl: "/api/xulux/download-proxy?id=abc",
      templateId: "abc",
      versionId: "v2",
      title: "Support agent",
    });
  });
});

describe("toCanvasSnapshot", () => {
  it("persists a loading canvas as empty", () => {
    const canvas: XuluxCanvasState = {
      status: "loading",
      url: null,
      source: null,
      error: null,
    };

    expect(toCanvasSnapshot(canvas, undefined).status).toBe("empty");
  });

  it("keeps the canvas title when the caller supplies none", () => {
    const canvas: XuluxCanvasState = {
      status: "ready",
      url: "/templates/preview",
      source: "agent_template",
      error: null,
      title: "Generated dashboard",
    };

    expect(toCanvasSnapshot(canvas, undefined).title).toBe(
      "Generated dashboard",
    );
  });

  it("prefers the canvas title over the supplied title", () => {
    const canvas: XuluxCanvasState = {
      status: "ready",
      url: "/templates/preview",
      source: "agent_template",
      error: null,
      title: "Generated dashboard",
    };

    expect(toCanvasSnapshot(canvas, "Support agent").title).toBe(
      "Generated dashboard",
    );
  });

  it("omits absent optional fields and takes the supplied title", () => {
    const canvas: XuluxCanvasState = {
      status: "ready",
      url: "/templates/preview",
      source: "template",
      error: null,
      templateId: "abc",
    };

    expect(toCanvasSnapshot(canvas, "Support agent")).toEqual({
      status: "ready",
      url: "/templates/preview",
      source: "template",
      error: null,
      templateId: "abc",
      title: "Support agent",
    });
  });

  it("round-trips a template canvas through the persisted shape", () => {
    const canvas: XuluxCanvasState = {
      status: "ready",
      url: "/templates/preview",
      source: "agent_template",
      error: null,
      templateId: "abc",
      versionId: "v2",
    };

    expect(
      fromCanvasSnapshot(toCanvasSnapshot(canvas, "Support agent")),
    ).toEqual({ ...canvas, title: "Support agent" });
  });
});
