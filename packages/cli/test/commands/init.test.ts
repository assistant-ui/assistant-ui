import { describe, expect, it } from "vitest";
import {
  init,
  createExistingProjectInitPlan,
  isNonInteractiveShell,
} from "../../src/commands/init";

describe("init command", () => {
  it("defaults --yes to false for interactive human flow", () => {
    const yesOption = init.options.find((option) => option.long === "--yes");
    expect(yesOption?.defaultValue).toBe(false);
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
      registryUrl: "https://example.com/preset.json",
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
      "https://example.com/preset.json",
    ]);
  });

  it("detects non-interactive mode from stdin TTY only", () => {
    expect(isNonInteractiveShell(false)).toBe(true);
    expect(isNonInteractiveShell(true)).toBe(false);
  });
});
