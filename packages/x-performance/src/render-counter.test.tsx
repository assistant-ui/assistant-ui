import { describe, expect, it } from "vitest";
import { createElement, memo, useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
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
});
