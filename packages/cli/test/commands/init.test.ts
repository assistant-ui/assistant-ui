import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  init,
  createExistingProjectInitPlan,
  isNonInteractiveShell,
} from "../../src/commands/init";
import { create } from "../../src/commands/create";

describe("init command", () => {
  it("defaults --yes to false for interactive human flow", () => {
    const yesOption = init.options.find((option) => option.long === "--yes");
    expect(yesOption?.defaultValue).toBe(false);
  });

  it("accepts --preset as a hidden compatibility option", () => {
    const presetOption = init.options.find(
      (option) => option.long === "--preset",
    );
    expect(presetOption).toBeDefined();
    expect((presetOption as { hidden?: boolean } | undefined)?.hidden).toBe(
      true,
    );
  });

  it("uses interactive init and add flow when --yes is not passed", () => {
    const plan = createExistingProjectInitPlan({
      yes: false,
      overwrite: false,
    });

    expect(plan.initArgs).toEqual(["shadcn@latest", "init"]);
    expect(plan.addArgs).toEqual(["shadcn@latest", "add"]);
  });

  it("uses non-interactive init+add flow when --yes is passed and config is missing", () => {
    const plan = createExistingProjectInitPlan({
      yes: true,
      overwrite: true,
    });

    expect(plan.initArgs).toEqual([
      "shadcn@latest",
      "init",
      "--defaults",
      "--yes",
    ]);
    expect(plan.addArgs).toEqual([
      "shadcn@latest",
      "add",
      "--yes",
      "--overwrite",
    ]);
  });

  it("detects non-interactive mode from stdin TTY only", () => {
    expect(isNonInteractiveShell(false)).toBe(true);
    expect(isNonInteractiveShell(true)).toBe(false);
  });

  it("delegates to create.parseAsync with correct args when no package.json exists", async () => {
    const parseAsyncSpy = vi
      .spyOn(create, "parseAsync")
      .mockResolvedValue(create);

    await init.parseAsync(["node", "init", "my-app", "--use-pnpm"], {
      from: "node",
    });

    expect(parseAsyncSpy).toHaveBeenCalledWith(
      [path.resolve("my-app"), "--use-pnpm"],
      { from: "user" },
    );

    parseAsyncSpy.mockRestore();
  });

  it("forwards the directory selected with --cwd to create", async () => {
    const selected = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "aui-init-")),
    );
    const parseAsyncSpy = vi
      .spyOn(create, "parseAsync")
      .mockResolvedValue(create);

    try {
      await init.parseAsync(
        ["node", "init", "my-app", "--cwd", selected, "--use-pnpm"],
        { from: "node" },
      );

      expect(parseAsyncSpy).toHaveBeenCalledWith(
        [path.join(selected, "my-app"), "--use-pnpm"],
        { from: "user" },
      );
    } finally {
      parseAsyncSpy.mockRestore();
      fs.rmSync(selected, { recursive: true, force: true });
    }
  });

  it("resolves a relative --cwd against the caller directory", async () => {
    const root = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "aui-init-")),
    );
    const caller = path.join(root, "caller");
    const selected = path.join(root, "selected");
    fs.mkdirSync(caller);
    fs.mkdirSync(selected);
    const previousCwd = process.cwd();
    const parseAsyncSpy = vi
      .spyOn(create, "parseAsync")
      .mockResolvedValue(create);
    process.chdir(caller);

    try {
      await init.parseAsync(
        ["node", "init", "my-app", "--cwd", "../selected"],
        { from: "node" },
      );

      expect(parseAsyncSpy).toHaveBeenCalledWith(
        [path.join(selected, "my-app")],
        { from: "user" },
      );
    } finally {
      process.chdir(previousCwd);
      parseAsyncSpy.mockRestore();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("delegates to create.parseAsync with preset args", async () => {
    const parseAsyncSpy = vi
      .spyOn(create, "parseAsync")
      .mockResolvedValue(create);

    await init.parseAsync(
      ["node", "init", "--preset", "https://example.com/preset.json"],
      { from: "node" },
    );

    expect(parseAsyncSpy).toHaveBeenCalledWith(
      ["--preset", "https://example.com/preset.json"],
      { from: "user" },
    );

    parseAsyncSpy.mockRestore();
  });
});
