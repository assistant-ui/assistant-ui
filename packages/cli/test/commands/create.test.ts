import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  create,
  resolveCreateProjectDirectory,
  resolvePresetUrl,
  resolveProject,
  resolveScaffoldSelector,
  PROJECT_METADATA,
} from "../../src/commands/create";
import { logger } from "../../src/lib/utils/logger";

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

  it("exposes --debug-source-root as a hidden option", () => {
    const debugSourceRootOption = create.options.find(
      (option) => option.long === "--debug-source-root",
    );
    expect(debugSourceRootOption).toBeDefined();
    expect(debugSourceRootOption?.hidden).toBe(true);
    expect(create.helpInformation()).not.toContain("--debug-source-root");
  });
});

describe("create directory guidance", () => {
  it.each([
    { name: "my-app", outside: false },
    { name: "space's $HOME [app] & %PATH% ! ^ `‘’‚‛", outside: false },
    { name: "-my-app", outside: false },
    { name: "outside-app", outside: true },
  ])("enters the created $name directory", async ({ name, outside }) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "aui-create-"));
    const caller = path.join(root, "caller");
    fs.mkdirSync(caller);
    const target = path.join(outside ? root : caller, name);
    const previousCwd = process.cwd();
    const sourceRoot = path.resolve(import.meta.dirname, "../../../..");
    const infoSpy = vi.spyOn(logger, "info");
    process.chdir(caller);

    try {
      await create.parseAsync(
        [
          outside ? target : `./${name}`,
          "--template",
          "minimal",
          "--debug-source-root",
          sourceRoot,
          "--skip-install",
          "--no-skills",
          "--use-pnpm",
        ],
        { from: "user" },
      );

      expect(
        JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf8"))
          .name,
      ).toBe(name);
      const cd = infoSpy.mock.calls
        .map(([message]) => message)
        .find((message) => message.trimStart().startsWith("cd "));
      expect(cd).toBeDefined();
      const result =
        process.platform === "win32"
          ? spawnSync(
              "powershell.exe",
              [
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $ErrorActionPreference = 'Stop'; ${cd}; (Get-Location).ProviderPath`,
              ],
              { encoding: "utf8" },
            )
          : spawnSync("/bin/sh", ["-c", `${cd} && pwd -P`], {
              encoding: "utf8",
            });
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe(fs.realpathSync(target));
    } finally {
      process.chdir(previousCwd);
      infoSpy.mockRestore();
      fs.rmSync(root, { recursive: true, force: true });
    }
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
        hasLocalComponents: false,
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
    const select = vi.fn().mockResolvedValue("with-ai-sdk-v7");
    const isCancel = vi.fn().mockReturnValue(false);

    const result = await resolveProject({
      stdinIsTTY: true,
      select,
      isCancel,
    });
    expect(result).toEqual(
      expect.objectContaining({
        name: "with-ai-sdk-v7",
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

describe("resolveScaffoldSelector", () => {
  it("returns an empty selector when no scaffold selector is provided", () => {
    expect(resolveScaffoldSelector({})).toEqual({});
  });

  it("maps --native to the Expo example", () => {
    expect(resolveScaffoldSelector({ native: true })).toEqual({
      example: "with-expo",
    });
  });

  it("maps --ink to the React Ink example", () => {
    expect(resolveScaffoldSelector({ ink: true })).toEqual({
      example: "with-react-ink",
    });
  });

  it("uses the default template when only --preset is provided", () => {
    expect(resolveScaffoldSelector({ preset: "chatgpt" })).toEqual({
      template: "default",
      preset: "chatgpt",
    });
  });

  it("rejects --native with --ink", () => {
    expect(() => resolveScaffoldSelector({ native: true, ink: true })).toThrow(
      "Only one scaffold selector can be provided (--native, --ink). Choose one scaffold selector: --template <name>, --example <name>, --native, or --ink. --preset <name-or-url> can be used with --template or by itself.",
    );
  });

  it("rejects --native with --example", () => {
    expect(() =>
      resolveScaffoldSelector({ native: true, example: "with-tanstack" }),
    ).toThrow(
      "Only one scaffold selector can be provided (--example, --native). Choose one scaffold selector: --template <name>, --example <name>, --native, or --ink. --preset <name-or-url> can be used with --template or by itself.",
    );
  });

  it("rejects --template with --example", () => {
    expect(() =>
      resolveScaffoldSelector({
        template: "default",
        example: "with-ai-sdk-v7",
      }),
    ).toThrow(
      "Only one scaffold selector can be provided (--template, --example). Choose one scaffold selector: --template <name>, --example <name>, --native, or --ink. --preset <name-or-url> can be used with --template or by itself.",
    );
  });

  it("rejects --ink with --template", () => {
    expect(() =>
      resolveScaffoldSelector({ ink: true, template: "default" }),
    ).toThrow(
      "Only one scaffold selector can be provided (--template, --ink). Choose one scaffold selector: --template <name>, --example <name>, --native, or --ink. --preset <name-or-url> can be used with --template or by itself.",
    );
  });

  it("allows --preset with --template", () => {
    expect(
      resolveScaffoldSelector({ preset: "chatgpt", template: "minimal" }),
    ).toEqual({
      template: "minimal",
      preset: "chatgpt",
    });
  });

  it("rejects --preset with --example", () => {
    expect(() =>
      resolveScaffoldSelector({
        preset: "chatgpt",
        example: "with-ai-sdk-v7",
      }),
    ).toThrow(
      "Cannot use --preset with --example. Choose one scaffold selector: --template <name>, --example <name>, --native, or --ink. --preset <name-or-url> can be used with --template or by itself.",
    );
  });

  it("rejects --preset with --native", () => {
    expect(() =>
      resolveScaffoldSelector({
        preset: "chatgpt",
        native: true,
      }),
    ).toThrow(
      "Cannot use --preset with --native. Choose one scaffold selector: --template <name>, --example <name>, --native, or --ink. --preset <name-or-url> can be used with --template or by itself.",
    );
  });

  it("rejects --preset with --ink", () => {
    expect(() =>
      resolveScaffoldSelector({
        preset: "chatgpt",
        ink: true,
      }),
    ).toThrow(
      "Cannot use --preset with --ink. Choose one scaffold selector: --template <name>, --example <name>, --native, or --ink. --preset <name-or-url> can be used with --template or by itself.",
    );
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

  it("--template rejects an empty name", async () => {
    await expect(
      resolveProject({ template: "", stdinIsTTY: true }),
    ).rejects.toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("--example rejects a template name", async () => {
    await expect(
      resolveProject({ example: "cloud", stdinIsTTY: true }),
    ).rejects.toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("--example rejects an empty name", async () => {
    await expect(
      resolveProject({ example: "", stdinIsTTY: true }),
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
  it("contains all 7 templates", () => {
    const templates = PROJECT_METADATA.filter((m) => m.category === "template");
    expect(templates).toHaveLength(7);
    expect(templates.map((t) => t.name)).toEqual([
      "default",
      "minimal",
      "cloud",
      "cloud-clerk",
      "langchain",
      "mcp",
      "eve",
    ]);
  });

  it("only the minimal template ships local components", () => {
    const templates = PROJECT_METADATA.filter((m) => m.category === "template");
    expect(
      templates.filter((t) => t.hasLocalComponents).map((t) => t.name),
    ).toEqual(["minimal"]);
  });

  it("examples have correct hasLocalComponents values", () => {
    const examples = PROJECT_METADATA.filter((m) => m.category === "example");
    const withLocalComponents = examples.filter((e) => e.hasLocalComponents);
    expect(withLocalComponents.map((e) => e.name)).toEqual([
      "with-expo",
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
