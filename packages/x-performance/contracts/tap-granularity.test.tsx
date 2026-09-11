import { describe, expect, it } from "vitest";
import { createElement, useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { resource, useResources, withKey } from "@assistant-ui/tap";
import { createRenderCounter } from "../src/render-counter";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = false;

const mount = (node: ComponentType) => {
  const root = createRoot(document.createElement("div"));
  flushSync(() => root.render(createElement(node)));
  return { unmount: () => flushSync(() => root.unmount()) };
};

describe("tap granularity", () => {
  it("one child resource update re-runs only that body", () => {
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
