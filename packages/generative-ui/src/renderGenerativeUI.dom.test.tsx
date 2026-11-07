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

describe("renderGenerativeUI element errors", () => {
  it("keeps the parent and sibling mounted when an element throws, then retries a new value", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const library: GenerativeUILibrary = {
      Parent: {
        description: "A parent.",
        properties: z.object({}),
        streamProperties: true,
        render: ({ children }) => <section>{children}</section>,
      },
      Fragile: {
        description: "A value that may fail while streaming.",
        properties: z.object({ value: z.string() }),
        streamProperties: true,
        render: ({ value }) => {
          if (value === "bad") throw new Error("bad present value");
          return <span>{value}</span>;
        },
      },
      Stable: {
        description: "A sibling.",
        properties: z.object({}),
        streamProperties: true,
        render: () => <strong>stable</strong>,
      },
    };
    const render = (value: string) =>
      root.render(
        <main>
          <p>host</p>
          {renderGenerativeUI(
            {
              $type: "Parent",
              children: [{ $type: "Fragile", value }, { $type: "Stable" }],
            },
            library,
            { status: "streaming" },
          )}
        </main>,
      );

    try {
      await act(async () => render("good"));
      const host = container.querySelector("main");
      const parent = container.querySelector("section");
      const sibling = container.querySelector("strong");
      expect(parent?.textContent).toBe("goodstable");

      await act(async () => render("bad"));
      expect(container.querySelector("main")).toBe(host);
      expect(host?.querySelector("p")?.textContent).toBe("host");
      expect(container.querySelector("section")).toBe(parent);
      expect(container.querySelector("strong")).toBe(sibling);
      expect(parent?.textContent).toBe("stable");

      await act(async () => render("recovered"));
      expect(container.querySelector("main")).toBe(host);
      expect(container.querySelector("section")).toBe(parent);
      expect(container.querySelector("strong")).toBe(sibling);
      expect(parent?.textContent).toBe("recoveredstable");
    } finally {
      await act(async () => root.unmount());
      errors.mockRestore();
    }
  });

  it("retries a failed element when its parent rerenders with the same value", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    let broken = true;
    const library: GenerativeUILibrary = {
      Fragile: {
        description: "A component with a transient failure.",
        properties: z.object({ value: z.string() }),
        streamProperties: true,
        render: ({ value }) => {
          if (broken) throw new Error("transient failure");
          return <span>{value}</span>;
        },
      },
      Stable: {
        description: "A sibling.",
        properties: z.object({}),
        streamProperties: true,
        render: () => <strong>stable</strong>,
      },
    };
    const render = () =>
      root.render(
        <>
          {renderGenerativeUI(
            [{ $type: "Fragile", value: "same" }, { $type: "Stable" }],
            library,
            { status: "streaming" },
          )}
        </>,
      );

    try {
      await act(async () => render());
      const sibling = container.querySelector("strong");
      expect(container.textContent).toBe("stable");

      broken = false;
      await act(async () => render());
      expect(container.querySelector("strong")).toBe(sibling);
      expect(container.textContent).toBe("samestable");
    } finally {
      await act(async () => root.unmount());
      errors.mockRestore();
    }
  });
});
