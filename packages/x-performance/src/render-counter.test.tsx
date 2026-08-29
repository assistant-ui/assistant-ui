import { describe, expect, it } from "vitest";
import { createElement, memo, useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { resource, useResources, withKey } from "@assistant-ui/tap";
import { createRenderCounter } from "./render-counter";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = false;

const mount = (node: ComponentType) => {
  const root = createRoot(document.createElement("div"));
  flushSync(() => root.render(createElement(node)));
  return { unmount: () => flushSync(() => root.unmount()) };
};

describe("createRenderCounter", () => {
  it("counts exact renders and commits across a memoized tree", () => {
    const counter = createRenderCounter();
    let bump!: () => void;

    const Leaf = ({ value }: { value: number }) =>
      createElement("span", null, value);
    const MemoA = memo(counter.track("leaf-a", Leaf));
    const MemoB = memo(counter.track("leaf-b", Leaf));

    const Parent = () => {
      counter.useRender("parent");
      const [v, set] = useState(0);
      bump = () => set((x) => x + 1);
      return createElement(
        "div",
        null,
        createElement(MemoA, { value: v }),
        createElement(MemoB, { value: -1 }),
      );
    };

    const app = mount(
      () => counter.wrapCommits("root", createElement(Parent)) as never,
    );

    expect(counter.snapshot()).toEqual({
      "renders:parent": 1,
      "renders:leaf-a": 1,
      "renders:leaf-b": 1,
      "commits:root": 1,
    });

    flushSync(() => bump());

    expect(counter.snapshot()).toEqual({
      "renders:parent": 2,
      "renders:leaf-a": 2,
      "renders:leaf-b": 1,
      "commits:root": 2,
    });

    app.unmount();
  });

  it("pins tap granularity: one child resource update re-runs only that body", () => {
    const counter = createRenderCounter();
    const bodyRuns = [0, 0, 0, 0, 0];
    const setters: ((v: number) => void)[] = [];

    const Leaf = resource(({ id }: { id: number }) => {
      bodyRuns[id]! += 1;
      const [v, set] = useState(0);
      setters[id] = set;
      return v;
    });

    const List = () => {
      counter.useRender("list");
      useResources(
        [0, 1, 2, 3, 4].map((id) => withKey(id, Leaf({ id }), [id])),
      );
      return null;
    };

    const app = mount(List);
    expect(bodyRuns).toEqual([1, 1, 1, 1, 1]);
    expect(counter.renders("list")).toBe(1);

    flushSync(() => setters[2]!(1));

    expect(bodyRuns).toEqual([1, 1, 2, 1, 1]);
    expect(counter.renders("list")).toBe(2);

    app.unmount();
  });
});
