// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createStateStore } from "./state";

describe("createStateStore writes", () => {
  it("lists writes oldest first, a later write replacing one at the same path", () => {
    const store = createStateStore();
    store.set("/a", 1);
    store.set("/b", 2);
    store.set("a", 3);
    expect(store.writes()).toEqual([
      ["/b", 2],
      ["/a", 3],
    ]);
  });

  it("replaces the writes array instead of mutating it", () => {
    const store = createStateStore();
    const before = store.writes();
    store.set("/a", 1);
    expect(store.writes()).not.toBe(before);
    expect(before).toEqual([]);
  });

  it("keeps every append to `-` when seeding new state", () => {
    const store = createStateStore({ list: [] });
    store.set("/list/-", "x");
    store.set("/list/-", "y");
    store.seed({ list: ["base"] });
    expect(store.get("/list")).toEqual(["base", "x", "y"]);
  });

  it("applies restored writes over the initial state and keeps them through seeds", () => {
    const store = createStateStore(
      { name: "model" },
      { writes: [["/name", "Ada"]] },
    );
    expect(store.get("/name")).toBe("Ada");
    expect(store.writes()).toEqual([["/name", "Ada"]]);
    store.seed({ name: "streamed", count: 1 });
    expect(store.getState()).toEqual({ name: "Ada", count: 1 });
  });

  it("replays root replacements through seeds and saved writes", () => {
    const edited = { name: "edited" };
    const store = createStateStore({ name: "model" });
    store.set("", edited);
    expect(store.writes()).toEqual([["", edited]]);

    store.seed({ name: "streamed", count: 1 });
    expect(store.getState()).toEqual(edited);

    const restored = createStateStore(
      { name: "model" },
      {
        writes: store.writes(),
      },
    );
    expect(restored.getState()).toEqual(edited);
  });

  it("drops a restored write that no longer applies", () => {
    const store = createStateStore(
      { text: "plain" },
      {
        writes: [
          ["/text/inner", 1],
          ["/ok", true],
        ],
      },
    );
    expect(store.getState()).toEqual({ text: "plain", ok: true });
    expect(store.writes()).toEqual([["/ok", true]]);
  });
  it("keeps every insert at an array index so a seed replays them all", () => {
    const store = createStateStore({ list: ["a"] });
    store.set("/list/0", "x");
    store.set("/list/0", "y");
    expect(store.get("/list")).toEqual(["y", "x", "a"]);
    store.seed({ list: ["a"] });
    expect(store.get("/list")).toEqual(["y", "x", "a"]);
    expect(store.writes()).toHaveLength(2);
  });

  it("drops earlier writes below a path the user replaces", () => {
    const store = createStateStore({ todos: [] });
    store.set("/todos/-", { title: "a", done: false });
    store.set("/todos/-", { title: "b", done: false });
    store.set("/todos/1/done", true);
    store.set("/todos", []);
    expect(store.writes()).toEqual([["/todos", []]]);
  });

  it("keeps an edit that an insert at an index moved to another item", () => {
    const base = () => ({ list: [{ done: false }, { done: false }] });
    const store = createStateStore(base());
    store.set("/list/0/done", true);
    store.set("/list/0", { done: false });
    store.set("/list/0/done", false);
    const edited = [{ done: false }, { done: true }, { done: false }];
    expect(store.get("/list")).toEqual(edited);
    store.seed(base());
    expect(store.get("/list")).toEqual(edited);
    expect(
      createStateStore(base(), { writes: store.writes() }).get("/list"),
    ).toEqual(edited);
  });

  it("drops a write replaced after an insert at the same item", () => {
    const store = createStateStore({ list: [{ done: false }] });
    store.set("/list/0", { done: false });
    store.set("/list/0/done", true);
    store.set("/list/0/done", false);
    expect(store.writes()).toEqual([
      ["/list/0", { done: false }],
      ["/list/0/done", false],
    ]);
  });

  it("drops a write replaced after an append, which moves no item", () => {
    const store = createStateStore({ list: [{ done: false }] });
    store.set("/list/0/done", true);
    store.set("/list/-", { done: false });
    store.set("/list/0/done", false);
    expect(store.writes()).toEqual([
      ["/list/-", { done: false }],
      ["/list/0/done", false],
    ]);
  });

  it("treats `-` under an object as an ordinary key", () => {
    const store = createStateStore({ map: {} });
    store.set("/map/-", 1);
    store.set("/map/-", 2);
    expect(store.writes()).toEqual([["/map/-", 2]]);
  });
});
