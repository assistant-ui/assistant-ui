// @vitest-environment jsdom
import { parsePartialJsonObject } from "assistant-stream/utils";
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

const mount = () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const show = (node: unknown) =>
    act(async () => {
      root.render(
        <GenerativeUITree
          node={node}
          library={library}
          context={{ status: "done" }}
        />,
      );
    });
  const counts = () =>
    [...container.querySelectorAll("button")].map(
      (button) => button.textContent,
    );
  const click = () =>
    act(async () => container.querySelector("button")!.click());
  return { show, counts, click, unmount: () => act(() => root.unmount()) };
};

const stack = (children: Record<string, unknown>[]) => ({
  $type: "Stack",
  children,
});

it("keeps a keyed child's state when a keyless sibling takes the place it first rendered in", async () => {
  const { show, counts, click, unmount } = mount();
  try {
    await show(
      parsePartialJsonObject('{"$type":"Stack","children":[{"$type":"Counter"'),
    );
    await click();
    await show(stack([{ $type: "Counter", $key: "a" }]));
    expect(counts()).toEqual(["1"]);
    await show(stack([{ $type: "Counter" }, { $type: "Counter", $key: "a" }]));
    expect(counts()).toEqual(["0", "1"]);
    await show(
      stack([
        { $type: "Counter" },
        { $type: "Counter", $key: "a" },
        { $type: "Counter", $key: "a" },
      ]),
    );
    expect(counts()).toEqual(["0", "1", "0"]);
  } finally {
    await unmount();
  }
});

it("gives a keyed child inserted where a finished keyless child was its own state", async () => {
  const { show, counts, click, unmount } = mount();
  try {
    await show(stack([{ $type: "Counter" }]));
    await click();
    await show(
      stack([{ $type: "Counter", $key: "new" }, { $type: "Counter" }]),
    );
    expect(counts()).toEqual(["0", "0"]);
  } finally {
    await unmount();
  }
});
