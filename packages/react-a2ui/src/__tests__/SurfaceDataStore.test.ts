import { describe, it, expect, vi } from "vitest";
import { SurfaceDataStore } from "../surface/SurfaceDataStore";

describe("SurfaceDataStore", () => {
  it("should set and get data at a path", () => {
    const store = new SurfaceDataStore();
    store.setData("s1", "/name", "Tokyo");
    expect(store.getData("s1", "/name")).toBe("Tokyo");
  });

  it("should return undefined for unset paths", () => {
    const store = new SurfaceDataStore();
    expect(store.getData("s1", "/missing")).toBeUndefined();
  });

  it("should return entire surface data when no path given", () => {
    const store = new SurfaceDataStore();
    store.setData("s1", "/a", 1);
    store.setData("s1", "/b", 2);
    expect(store.getData("s1")).toEqual({ "/a": 1, "/b": 2 });
  });

  it("should notify exact path subscribers", () => {
    const store = new SurfaceDataStore();
    const listener = vi.fn();
    store.subscribe("s1", "/name", listener);

    store.setData("s1", "/name", "Tokyo");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should not notify unrelated path subscribers", () => {
    const store = new SurfaceDataStore();
    const nameListener = vi.fn();
    const dateListener = vi.fn();
    store.subscribe("s1", "/name", nameListener);
    store.subscribe("s1", "/date", dateListener);

    store.setData("s1", "/name", "Tokyo");
    expect(nameListener).toHaveBeenCalledTimes(1);
    expect(dateListener).not.toHaveBeenCalled();
  });

  it("should notify descendant subscribers on ancestor update (subtree invalidation)", () => {
    const store = new SurfaceDataStore();
    const destListener = vi.fn();
    const dateListener = vi.fn();
    store.subscribe("s1", "/booking/destination", destListener);
    store.subscribe("s1", "/booking/date", dateListener);

    store.setData("s1", "/booking", {
      destination: "Tokyo",
      date: "2026-05-15",
    });
    expect(destListener).toHaveBeenCalledTimes(1);
    expect(dateListener).toHaveBeenCalledTimes(1);
  });

  it("should notify root subscribers on any update", () => {
    const store = new SurfaceDataStore();
    const rootListener = vi.fn();
    store.subscribe("s1", "/", rootListener);

    store.setData("s1", "/booking/destination", "Tokyo");
    expect(rootListener).toHaveBeenCalledTimes(1);
  });

  it("should NOT notify ancestor subscribers on descendant update", () => {
    const store = new SurfaceDataStore();
    const parentListener = vi.fn();
    store.subscribe("s1", "/booking", parentListener);

    store.setData("s1", "/booking/destination", "Tokyo");
    expect(parentListener).not.toHaveBeenCalled();
  });

  it("should unsubscribe correctly", () => {
    const store = new SurfaceDataStore();
    const listener = vi.fn();
    const unsub = store.subscribe("s1", "/name", listener);

    store.setData("s1", "/name", "Tokyo");
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    store.setData("s1", "/name", "Osaka");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("should clean up on deleteSurface", () => {
    const store = new SurfaceDataStore();
    store.setData("s1", "/name", "Tokyo");
    store.deleteSurface("s1");
    expect(store.getData("s1", "/name")).toBeUndefined();
  });

  it("should not notify listeners for a deleted surface", () => {
    const store = new SurfaceDataStore();
    const listener = vi.fn();
    store.subscribe("s1", "/name", listener);
    store.deleteSurface("s1");

    store.setData("s1", "/name", "new");
    expect(listener).toHaveBeenCalledTimes(0);
  });
});
