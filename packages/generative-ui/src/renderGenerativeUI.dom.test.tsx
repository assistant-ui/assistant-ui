// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { renderGenerativeUI } from "./renderGenerativeUI";
import type { GenerativeUILibrary } from "./types";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const library = {
  Parent: {
    description: "A parent.",
    properties: z.object({}),
    render: ({ children }: { children?: React.ReactNode }) => (
      <section>{children}</section>
    ),
  },
  One: {
    description: "One hook.",
    properties: z.object({}),
    render: function OneRender() {
      const [value, setValue] = useState(0);
      return (
        <button onClick={() => setValue((current) => current + 1)}>
          {value}
        </button>
      );
    },
  },
  Two: {
    description: "Two hooks.",
    properties: z.object({}),
    render: function TwoRender() {
      useState(0);
      useState(0);
      return <span>two</span>;
    },
  },
} satisfies GenerativeUILibrary;

describe("renderGenerativeUI type identity", () => {
  it.each(["root", "model-keyed child"] as const)(
    "remounts a %s renderer when its node type changes",
    async (location) => {
      const container = document.createElement("div");
      const root = createRoot(container);
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      const node = (type: "One" | "Two") =>
        location === "root"
          ? { $type: type }
          : {
              $type: "Parent",
              children: [{ $type: type, $key: "stable" }],
            };
      const render = (type: "One" | "Two") =>
        root.render(renderGenerativeUI(node(type), library));

      try {
        await act(async () => render("One"));
        const button = container.querySelector("button");
        expect(button?.textContent).toBe("0");

        await act(async () => button?.click());
        expect(button?.textContent).toBe("1");

        await act(async () => render("One"));
        expect(container.querySelector("button")?.textContent).toBe("1");

        await act(async () => render("Two"));
        expect(container.querySelector("span")?.textContent).toBe("two");

        await act(async () => render("One"));
        expect(container.querySelector("button")?.textContent).toBe("0");
        expect(
          errors.mock.calls
            .flat()
            .filter((message) =>
              /hook order|order of hooks|rendered (more|fewer) hooks/i.test(
                String(message),
              ),
            ),
        ).toEqual([]);
      } finally {
        await act(async () => root.unmount());
        errors.mockRestore();
      }
    },
  );
});
