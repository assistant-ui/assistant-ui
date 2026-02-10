import { describe, expect, it, vi } from "vitest";
import {
  buildCreateNextAppArgs,
  create,
  resolveCreateProjectDirectory,
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

  it("builds create-next-app args from parsed create options", () => {
    const args = buildCreateNextAppArgs({
      projectDirectory: "my-app",
      usePnpm: true,
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
