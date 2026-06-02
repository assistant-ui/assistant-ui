import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { z } from "zod";
import { JSONGenerativeUI as ClientGenUI } from "./JSONGenerativeUI.client";
import { JSONGenerativeUI as ServerGenUI } from "./JSONGenerativeUI.server";
import { defineGenerativeComponents } from "./defineGenerativeComponents";
import type { GenerativeUILibrary } from "./types";

const library: GenerativeUILibrary = {
  Card: {
    description: "A card.",
    properties: z.object({ title: z.string() }),
    render: ({ title, children }: any) => (
      <section data-title={title}>{children}</section>
    ),
  },
  Button: {
    description: "A button.",
    properties: z.object({ label: z.string() }),
    render: ({ label }: any) => <button>{label}</button>,
  },
};

const renderTool = (tool: any, args: unknown) =>
  renderToStaticMarkup(
    <>{tool.render({ args, status: { type: "complete" } })}</>,
  );

describe("JSONGenerativeUI — client build", () => {
  const ui = new ClientGenUI({ library });

  it("present is a frontend tool with matching parameters, render, and execute", () => {
    const tool = ui.present();
    expect(tool.type).toBe("frontend");
    expect(typeof tool.execute).toBe("function");
    expect(typeof tool.render).toBe("function");
    expect(tool.unstable_backendDefault).toEqual({ parameters: true });
    expect((tool.parameters as any).properties.$type.enum).toEqual([
      "Card",
      "Button",
    ]);
  });

  it("present renders the model's tree against the library", () => {
    const html = renderTool(ui.present(), { $type: "Card", title: "Hi" });
    expect(html).toBe('<section data-title="Hi"></section>');
  });

  it("prompt_user is a human tool that renders the tree (no execute)", () => {
    const tool = ui.promptUser();
    expect(tool.type).toBe("human");
    expect(tool.unstable_backendDefault).toEqual({ parameters: true });
    expect((tool as any).execute).toBeUndefined();
    const html = renderTool(tool, { $type: "Button", label: "ok" });
    expect(html).toBe("<button>ok</button>");
  });
});

describe("JSONGenerativeUI — server build", () => {
  const ui = new ServerGenUI({ library });

  it("present carries only schema (no render/execute) and matches the client schema", () => {
    const tool = ui.present() as any;
    expect(tool.type).toBe("frontend");
    expect(tool.render).toBeUndefined();
    expect(tool.execute).toBeUndefined();
    expect(tool.parameters.properties.$type.enum).toEqual(["Card", "Button"]);
    // schema is identical to the client's, so the model and the browser agree
    expect(tool.parameters).toEqual(
      new ClientGenUI({ library }).present().parameters,
    );
  });

  it("prompt_user carries only schema (no render)", () => {
    const tool = ui.promptUser() as any;
    expect(tool.type).toBe("human");
    expect(tool.render).toBeUndefined();
    expect(tool.parameters.properties.$type.enum).toEqual(["Card", "Button"]);
  });
});

describe("defineGenerativeComponents", () => {
  it("throws at runtime — it must be stripped by the compiler, never called", () => {
    expect(() => defineGenerativeComponents({})).toThrow(
      /no runtime implementation/,
    );
  });
});
