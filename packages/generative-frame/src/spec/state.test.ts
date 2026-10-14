// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createStateStore, type SpecStateWrite } from "./state";

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

  it("preserves array appends when the model array is absent", () => {
    const store = createStateStore({ items: [] });
    store.set("/items/-", "first");
    store.set("/items/-", "second");
    const writes = JSON.parse(
      JSON.stringify(store.writes()),
    ) as SpecStateWrite[];

    store.seed({});
    expect(store.getState()).toEqual({ items: ["first", "second"] });
    expect(createStateStore({}, { writes }).getState()).toEqual({
      items: ["first", "second"],
    });

    store.seed({ items: ["model"] });
    expect(store.getState()).toEqual({ items: ["model", "first", "second"] });
  });

  it("preserves nested array parents when restoring serialized writes", () => {
    const store = createStateStore({ groups: [{ items: [] }] });
    store.set("/groups/0/items/-", "first");
    store.set("/groups/0/items/-", "second");
    const writes = JSON.parse(
      JSON.stringify(store.writes()),
    ) as SpecStateWrite[];

    expect(createStateStore({ groups: [{}] }, { writes }).getState()).toEqual({
      groups: [{ items: ["first", "second"] }],
    });
    expect(createStateStore({}, { writes }).getState()).toEqual({});
  });

  it("drops a replayed write into an array item that is gone", () => {
    const store = createStateStore({
      todos: [{ done: false }, { done: false }, { done: false }],
    });
    store.set("/todos/2/done", true, "replace");
    store.seed({});
    expect(store.getState()).toEqual({});
    expect(store.writes()).toEqual([]);
  });

  it("keeps a present object parent when saved writes recorded an array", () => {
    const source = createStateStore({ items: [] });
    source.set("/items/-", "first");
    source.set("/items/-", "second");
    const writes = JSON.parse(
      JSON.stringify(source.writes()),
    ) as SpecStateWrite[];
    const restored = createStateStore({ items: {} }, { writes });

    expect(restored.getState()).toEqual({ items: { "-": "second" } });
    expect(restored.writes()).toEqual([
      ["/items/-", "second", "add", ["/items"]],
    ]);
  });

  it.each(["-", "0"])(
    "keeps `%s` as an object key while replaying writes",
    (key) => {
      const store = createStateStore({ map: {} });
      store.set(`/map/${key}`, "first");
      store.set(`/map/${key}`, "second");
      const writes = JSON.parse(
        JSON.stringify(store.writes()),
      ) as SpecStateWrite[];

      store.seed({});
      expect(store.getState()).toEqual({ map: { [key]: "second" } });
      expect(createStateStore({}, { writes }).getState()).toEqual({
        map: { [key]: "second" },
      });
    },
  );

  it("keeps the replacement marker and drops a restored replacement whose item is gone", () => {
    const writes = JSON.parse(
      JSON.stringify([["/items/0", "edited", "replace"]]),
    ) as SpecStateWrite[];
    const store = createStateStore({ items: ["model"] }, { writes });

    expect(store.getState()).toEqual({ items: ["edited"] });
    expect(store.writes()).toEqual([
      ["/items/0", "edited", "replace", ["/items"]],
    ]);
    const restored = createStateStore(
      {},
      {
        writes: JSON.parse(JSON.stringify(store.writes())) as SpecStateWrite[],
      },
    );
    expect(restored.getState()).toEqual({});
    store.seed({});
    expect(store.getState()).toEqual({});
    expect(store.writes()).toEqual([]);
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

  it.each(["remove", "unknown", null])(
    "keeps add semantics for an unsupported saved mode: %s",
    (mode) => {
      const store = createStateStore(
        { list: ["original"] },
        {
          writes: JSON.parse(JSON.stringify([["/list/0", "restored", mode]])),
        },
      );
      expect(store.get("/list")).toEqual(["restored", "original"]);
      expect(store.writes()).toEqual([
        ["/list/0", "restored", "add", ["/list"]],
      ]);
      store.seed({ list: ["streamed"] });
      expect(store.get("/list")).toEqual(["restored", "streamed"]);
    },
  );

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
      ["/list/0", { done: false }, "add", ["/list"]],
      ["/list/0/done", false, "add", ["/list"]],
    ]);
  });

  it("drops a write replaced after an append, which moves no item", () => {
    const store = createStateStore({ list: [{ done: false }] });
    store.set("/list/0/done", true);
    store.set("/list/-", { done: false });
    store.set("/list/0/done", false);
    expect(store.writes()).toEqual([
      ["/list/-", { done: false }, "add", ["/list"]],
      ["/list/0/done", false, "add", ["/list"]],
    ]);
  });

  it("replays replacements and insertions without losing shifted edits", () => {
    const initial = { list: ["a", "b"] };
    const store = createStateStore(initial);
    store.set("/list/0", "edited", "replace");
    store.set("/list/0", "inserted");
    store.set("/list/0", "edited insert", "replace");
    store.set("/list/0", "final", "replace");
    expect(store.get("/list")).toEqual(["final", "edited", "b"]);
    expect(store.writes()).toEqual([
      ["/list/0", "edited", "replace", ["/list"]],
      ["/list/0", "inserted", "add", ["/list"]],
      ["/list/0", "final", "replace", ["/list"]],
    ]);
    store.seed({ list: ["a", "streamed"] });
    expect(store.get("/list")).toEqual(["final", "edited", "streamed"]);
    expect(
      createStateStore(initial, {
        writes: JSON.parse(JSON.stringify(store.writes())),
      }).get("/list"),
    ).toEqual(["final", "edited", "b"]);
  });

  it("drops a replacement when its array item no longer exists", () => {
    const store = createStateStore({ list: ["a"] });
    store.set("/list/0", "edited", "replace");
    store.seed({ list: [] });
    expect(store.get("/list")).toEqual([]);
    expect(store.writes()).toEqual([]);
  });

  it("treats `-` under an object as an ordinary key", () => {
    const store = createStateStore({ map: {} });
    store.set("/map/-", 1);
    store.set("/map/-", 2);
    expect(store.writes()).toEqual([["/map/-", 2]]);
  });
});
