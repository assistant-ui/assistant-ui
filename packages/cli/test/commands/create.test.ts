import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  create,
  resolveCreateProjectDirectory,
  resolvePresetUrl,
  resolveProject,
  PROJECT_METADATA,
} from "../../src/commands/create";

describe("create command", () => {
  it("exposes --preset option", () => {
    const presetOption = create.options.find(
      (option) => option.long === "--preset",
    );
    expect(presetOption).toBeDefined();
  });

  it("exposes --template option", () => {
    const templateOption = create.options.find(
      (option) => option.long === "--template",
    );
    expect(templateOption).toBeDefined();
  });

  it("exposes --example option", () => {
    const exampleOption = create.options.find(
      (option) => option.long === "--example",
    );
    expect(exampleOption).toBeDefined();
  });
});

describe("resolveProject", () => {
  it("returns template metadata when --template is provided", async () => {
    const result = await resolveProject({
      template: "cloud",
      stdinIsTTY: true,
    });
    expect(result).toEqual(
      expect.objectContaining({
        name: "cloud",
        category: "template",
        hasLocalComponents: true,
      }),
    );
  });

  it("returns example metadata when --example is provided", async () => {
    const result = await resolveProject({
      example: "with-langgraph",
      stdinIsTTY: true,
    });
    expect(result).toEqual(
      expect.objectContaining({
        name: "with-langgraph",
        category: "example",
        hasLocalComponents: false,
      }),
    );
  });

  it("supports the cloud-clerk template", async () => {
    const result = await resolveProject({
      template: "cloud-clerk",
      stdinIsTTY: true,
    });
    expect(result).toEqual(
      expect.objectContaining({
        name: "cloud-clerk",
        category: "template",
      }),
    );
  });

  it("defaults to default template in non-interactive shells", async () => {
    const result = await resolveProject({
      stdinIsTTY: false,
    });
    expect(result).toEqual(
      expect.objectContaining({
        name: "default",
        category: "template",
      }),
    );
  });

  it("uses selected project in interactive mode", async () => {
    const select = vi.fn().mockResolvedValue("with-ai-sdk-v6");
    const isCancel = vi.fn().mockReturnValue(false);

    const result = await resolveProject({
      stdinIsTTY: true,
      select,
      isCancel,
    });
    expect(result).toEqual(
      expect.objectContaining({
        name: "with-ai-sdk-v6",
        category: "example",
      }),
    );
  });

  it("returns null when selection is cancelled", async () => {
    const select = vi.fn().mockResolvedValue(Symbol("cancel"));
    const isCancel = vi.fn().mockReturnValue(true);

    const result = await resolveProject({
      stdinIsTTY: true,
      select,
      isCancel,
    });
    expect(result).toBeNull();
  });
});

describe("resolveProject error handling", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it("--template rejects an example name", async () => {
    await expect(
      resolveProject({ template: "with-langgraph", stdinIsTTY: true }),
    ).rejects.toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("--example rejects a template name", async () => {
    await expect(
      resolveProject({ example: "cloud", stdinIsTTY: true }),
    ).rejects.toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits when picker returns separator value", async () => {
    const select = vi.fn().mockResolvedValue("_separator");
    const isCancel = vi.fn().mockReturnValue(false);

    await expect(
      resolveProject({ stdinIsTTY: true, select, isCancel }),
    ).rejects.toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe("PROJECT_METADATA", () => {
  it("contains all 6 templates", () => {
    const templates = PROJECT_METADATA.filter((m) => m.category === "template");
    expect(templates).toHaveLength(6);
    expect(templates.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        "default",
        "minimal",
        "cloud",
        "cloud-clerk",
        "langgraph",
        "mcp",
      ]),
    );
  });

  it("all templates have hasLocalComponents: true", () => {
    const templates = PROJECT_METADATA.filter((m) => m.category === "template");
    for (const t of templates) {
      expect(t.hasLocalComponents).toBe(true);
    }
  });

  it("examples have correct hasLocalComponents values", () => {
    const examples = PROJECT_METADATA.filter((m) => m.category === "example");
    const withLocalComponents = examples.filter((e) => e.hasLocalComponents);
    // These examples ship their own components (no shadcn)
    expect(withLocalComponents.map((e) => e.name)).toEqual([
      "with-expo",
      "with-interactables",
      "with-react-ink",
    ]);
  });

  it("every entry has a path", () => {
    for (const m of PROJECT_METADATA) {
      expect(m.path).toBeTruthy();
      expect(
        m.path.startsWith("templates/") || m.path.startsWith("examples/"),
      ).toBe(true);
    }
  });
});

describe("resolveCreateProjectDirectory", () => {
  it("defaults project directory in non-interactive mode", () => {
    expect(
      resolveCreateProjectDirectory({
        stdinIsTTY: false,
      }),
    ).toBe("my-aui-app");
  });

  it("does not force a project directory in interactive mode", () => {
    expect(
      resolveCreateProjectDirectory({
        stdinIsTTY: true,
      }),
    ).toBeUndefined();
  });

  it("keeps provided project directory in non-interactive mode", () => {
    expect(
      resolveCreateProjectDirectory({
        projectDirectory: "custom-app",
        stdinIsTTY: false,
      }),
    ).toBe("custom-app");
  });
});

describe("resolvePresetUrl", () => {
  it("passes through full https URLs unchanged", () => {
    const url = "https://www.assistant-ui.com/playground/init?preset=chatgpt";
    expect(resolvePresetUrl(url)).toBe(url);
  });

  it("passes through http URLs unchanged", () => {
    const url = "http://localhost:3000/preset";
    expect(resolvePresetUrl(url)).toBe(url);
  });

  it("expands a bare preset name to the playground URL", () => {
    expect(resolvePresetUrl("chatgpt")).toBe(
      "https://www.assistant-ui.com/playground/init?preset=chatgpt",
    );
  });

  it("encodes special characters in preset names", () => {
    expect(resolvePresetUrl("my preset")).toBe(
      "https://www.assistant-ui.com/playground/init?preset=my%20preset",
    );
  });
});
