import { describe, it, expect } from "vitest";
import { defineToolkit, hitlTool, stubTool, providerTool } from "./toolkit";

const render = () => null;
const execute = async () => ({ ok: true });

describe("defineToolkit (runtime)", () => {
  it("resolves a plain execute to a frontend tool, keeping execute and render", () => {
    const toolkit = defineToolkit({
      get_weather: { description: "w", parameters: {}, execute, render },
    });
    const tool = toolkit["get_weather"] as Record<string, unknown>;
    expect(tool["type"]).toBe("frontend");
    expect(tool["execute"]).toBe(execute);
    expect(tool["render"]).toBe(render);
  });

  it("resolves hitlTool() to a human tool and drops the marker execute", () => {
    const toolkit = defineToolkit({
      ask: { description: "a", parameters: {}, execute: hitlTool(), render },
    });
    const tool = toolkit["ask"] as Record<string, unknown>;
    expect(tool["type"]).toBe("human");
    expect(tool["execute"]).toBeUndefined();
    expect(tool["render"]).toBe(render);
  });

  it("resolves stubTool() to a frontend tool with no executor", () => {
    const toolkit = defineToolkit({
      add_task: {
        description: "t",
        parameters: {},
        execute: stubTool(),
        render,
      },
    });
    const tool = toolkit["add_task"] as Record<string, unknown>;
    expect(tool["type"]).toBe("frontend");
    expect(tool["execute"]).toBeUndefined();
  });

  it("resolves providerTool(config) to a provider tool, spreading the config", () => {
    const toolkit = defineToolkit({
      web_search: {
        execute: providerTool({
          providerId: "openai.web_search_preview",
          args: { searchContextSize: "low" },
        }),
      },
    });
    const tool = toolkit["web_search"] as Record<string, unknown>;
    expect(tool["type"]).toBe("provider");
    expect(tool["providerId"]).toBe("openai.web_search_preview");
    expect(tool["args"]).toEqual({ searchContextSize: "low" });
    expect(tool["execute"]).toBeUndefined();
  });

  it("passes through an entry that already declares a type", () => {
    const toolkit = defineToolkit({
      // render-only entry (plain-toolkit style); kept as authored
      shown_elsewhere: { type: "backend", render } as never,
    });
    const tool = toolkit["shown_elsewhere"] as Record<string, unknown>;
    expect(tool["type"]).toBe("backend");
    expect(tool["render"]).toBe(render);
  });
});
