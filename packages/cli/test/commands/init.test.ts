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

  it("uses interactive add flow when --yes is not passed", () => {
    const plan = createExistingProjectInitPlan({
      yes: false,
      overwrite: false,
      registryUrl: "https://r.assistant-ui.com/chat/b/ai-sdk-quick-start/json",
    });

    expect(plan.initArgs).toBeNull();
    expect(plan.addArgs).toEqual([
      "shadcn@latest",
      "add",
      "https://r.assistant-ui.com/chat/b/ai-sdk-quick-start/json",
    ]);
  });

  it("uses non-interactive init+add flow when --yes is passed and config is missing", () => {
    const plan = createExistingProjectInitPlan({
      yes: true,
      overwrite: true,
      registryUrl: "https://example.com/registry.json",
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
      "https://example.com/registry.json",
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

    expect(parseAsyncSpy).toHaveBeenCalledWith(["my-app", "--use-pnpm"], {
      from: "user",
    });

    parseAsyncSpy.mockRestore();
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
