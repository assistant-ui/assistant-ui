import { describe, it, expect, vi } from "vitest";
import { SurfaceManager } from "../surface/SurfaceManager";

describe("SurfaceManager", () => {
  it("should create a surface", () => {
    const mgr = new SurfaceManager();
    mgr.createSurface({ surfaceId: "s1" });
    expect(mgr.getSurface("s1")).toEqual({ surfaceId: "s1", components: [] });
  });

  it("should create a surface with metadata", () => {
    const mgr = new SurfaceManager();
    mgr.createSurface({ surfaceId: "s1", metadata: { title: "Test" } });
    expect(mgr.getSurface("s1")?.metadata).toEqual({ title: "Test" });
  });

  it("should return all surfaces", () => {
    const mgr = new SurfaceManager();
    mgr.createSurface({ surfaceId: "s1" });
    mgr.createSurface({ surfaceId: "s2" });
    expect(mgr.getSurfaces()).toHaveLength(2);
  });

  it("should replace components on updateComponents", () => {
    const mgr = new SurfaceManager();
    mgr.createSurface({ surfaceId: "s1" });
    mgr.updateComponents({
      surfaceId: "s1",
      components: [{ type: "Button", id: "b1" }],
    });
    expect(mgr.getSurface("s1")?.components).toEqual([
      { type: "Button", id: "b1" },
    ]);

    mgr.updateComponents({
      surfaceId: "s1",
      components: [{ type: "Text", id: "t1" }],
    });
    expect(mgr.getSurface("s1")?.components).toEqual([
      { type: "Text", id: "t1" },
    ]);
  });

  it("should delete a surface", () => {
    const mgr = new SurfaceManager();
    mgr.createSurface({ surfaceId: "s1" });
    mgr.deleteSurface({ surfaceId: "s1" });
    expect(mgr.getSurface("s1")).toBeUndefined();
  });

  it("should notify listeners on changes", () => {
    const mgr = new SurfaceManager();
    const listener = vi.fn();
    mgr.subscribe(listener);

    mgr.createSurface({ surfaceId: "s1" });
    expect(listener).toHaveBeenCalledTimes(1);

    mgr.updateComponents({ surfaceId: "s1", components: [] });
    expect(listener).toHaveBeenCalledTimes(2);

    mgr.deleteSurface({ surfaceId: "s1" });
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("should unsubscribe listeners", () => {
    const mgr = new SurfaceManager();
    const listener = vi.fn();
    const unsub = mgr.subscribe(listener);

    mgr.createSurface({ surfaceId: "s1" });
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    mgr.createSurface({ surfaceId: "s2" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should return stable snapshot reference when unchanged", () => {
    const mgr = new SurfaceManager();
    mgr.createSurface({ surfaceId: "s1" });
    const snap1 = mgr.getSnapshot();
    const snap2 = mgr.getSnapshot();
    expect(snap1).toBe(snap2);
  });

  it("should return new snapshot reference on change", () => {
    const mgr = new SurfaceManager();
    mgr.createSurface({ surfaceId: "s1" });
    const snap1 = mgr.getSnapshot();
    mgr.createSurface({ surfaceId: "s2" });
    const snap2 = mgr.getSnapshot();
    expect(snap1).not.toBe(snap2);
  });

  it("should ignore updateComponents for non-existent surface", () => {
    const mgr = new SurfaceManager();
    const listener = vi.fn();
    mgr.subscribe(listener);
    mgr.updateComponents({ surfaceId: "missing", components: [] });
    expect(listener).not.toHaveBeenCalled();
  });
});
