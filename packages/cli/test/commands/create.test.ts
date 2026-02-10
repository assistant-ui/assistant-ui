import { describe, expect, it, vi } from "vitest";
import {
  buildCreateNextAppArgs,
  create,
  resolveCreateTemplateName,
} from "../../src/commands/create";

describe("create command template resolution", () => {
  it("exposes --preset option", () => {
    const presetOption = create.options.find(
      (option) => option.long === "--preset",
    );
    expect(presetOption).toBeDefined();
  });

  it("uses explicit template when provided", async () => {
    await expect(
      resolveCreateTemplateName({
        template: "cloud",
        stdinIsTTY: true,
      }),
    ).resolves.toBe("cloud");
  });

  it("supports the cloud-clerk template", async () => {
    await expect(
      resolveCreateTemplateName({
        template: "cloud-clerk",
        stdinIsTTY: true,
      }),
    ).resolves.toBe("cloud-clerk");
  });

  it("defaults to default template in non-interactive shells", async () => {
    await expect(
      resolveCreateTemplateName({
        stdinIsTTY: false,
      }),
    ).resolves.toBe("default");
  });

  it("uses selected template in interactive mode", async () => {
    const select = vi.fn().mockResolvedValue("langgraph");
    const isCancel = vi.fn().mockReturnValue(false);

    await expect(
      resolveCreateTemplateName({
        stdinIsTTY: true,
        select,
        isCancel,
      }),
    ).resolves.toBe("langgraph");
  });

  it("returns null when template selection is cancelled", async () => {
    const select = vi.fn().mockResolvedValue(Symbol("cancel"));
    const isCancel = vi.fn().mockReturnValue(true);

    await expect(
      resolveCreateTemplateName({
        stdinIsTTY: true,
        select,
        isCancel,
      }),
    ).resolves.toBeNull();
  });

  it("strips template and preset flags before forwarding args to create-next-app", () => {
    const args = buildCreateNextAppArgs({
      commandArgs: [
        "my-app",
        "--use-pnpm",
        "--template",
        "cloud",
        "--preset",
        "https://example.com/preset.json",
      ],
      templateUrl: "https://github.com/assistant-ui/assistant-cloud-starter",
    });

    expect(args).toEqual([
      "create-next-app@latest",
      "my-app",
      "--use-pnpm",
      "-e",
      "https://github.com/assistant-ui/assistant-cloud-starter",
    ]);
  });
});
