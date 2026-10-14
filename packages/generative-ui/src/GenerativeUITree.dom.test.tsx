// @vitest-environment jsdom
import { act, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { z } from "zod";
import { GenerativeUITree } from "./GenerativeUITree";
import type { GenerativeUILibrary } from "./types";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const library = {
  Stack: {
    description: "A stack.",
    properties: z.object({}),
    render: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  },
  Counter: {
    description: "A counter.",
    properties: z.object({}),
    render: function CounterRender() {
      const [count, setCount] = useState(0);
      return (
        <button onClick={() => setCount((current) => current + 1)}>
          {count}
        </button>
      );
    },
  },
} satisfies GenerativeUILibrary;

it("keeps a keyed child's state when a keyless sibling takes the place it first rendered in", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const show = (children: Record<string, unknown>[]) =>
    act(async () => {
      root.render(
        <GenerativeUITree
          node={{ $type: "Stack", children }}
          library={library}
          context={{ status: "done" }}
        />,
      );
    });
  const counts = () =>
    [...container.querySelectorAll("button")].map(
      (button) => button.textContent,
    );
  try {
    await show([{ $type: "Counter" }]);
    await act(async () => container.querySelector("button")!.click());
    await show([{ $type: "Counter", $key: "a" }]);
    expect(counts()).toEqual(["1"]);
    await show([{ $type: "Counter" }, { $type: "Counter", $key: "a" }]);
    expect(counts()).toEqual(["0", "1"]);
    await show([
      { $type: "Counter" },
      { $type: "Counter", $key: "a" },
      { $type: "Counter", $key: "a" },
    ]);
    expect(counts()).toEqual(["0", "1", "0"]);
  } finally {
    act(() => root.unmount());
  }
});
