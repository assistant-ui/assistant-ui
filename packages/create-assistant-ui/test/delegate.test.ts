import { describe, expect, it, vi } from "vitest";
import {
  buildAssistantUiCreateArgs,
  delegateToAssistantUiCreate,
  resolveAssistantUiBinPath,
} from "../src/run";

describe("buildAssistantUiCreateArgs", () => {
  it("prefixes arguments with the create command", () => {
    expect(
      buildAssistantUiCreateArgs(["my-app", "--template", "cloud"]),
    ).toEqual(["create", "my-app", "--template", "cloud"]);
  });

  it("does not add create twice", () => {
    expect(buildAssistantUiCreateArgs(["create", "my-app"])).toEqual([
      "create",
      "my-app",
    ]);
  });
});

describe("resolveAssistantUiBinPath", () => {
  it("resolves the assistant-ui bin path from a bin object", async () => {
    await expect(
      resolveAssistantUiBinPath({
        resolvePackageJsonPath: () =>
          "/tmp/node_modules/assistant-ui/package.json",
        readTextFile: async () =>
          JSON.stringify({
            bin: {
              "assistant-ui": "./dist/index.js",
            },
          }),
      }),
    ).resolves.toBe("/tmp/node_modules/assistant-ui/dist/index.js");
  });

  it("resolves the assistant-ui bin path from a string bin", async () => {
    await expect(
      resolveAssistantUiBinPath({
        resolvePackageJsonPath: () =>
          "/tmp/node_modules/assistant-ui/package.json",
        readTextFile: async () =>
          JSON.stringify({
            bin: "./dist/index.js",
          }),
      }),
    ).resolves.toBe("/tmp/node_modules/assistant-ui/dist/index.js");
  });

  it("fails when the assistant-ui bin is missing", async () => {
    await expect(
      resolveAssistantUiBinPath({
        resolvePackageJsonPath: () =>
          "/tmp/node_modules/assistant-ui/package.json",
        readTextFile: async () => JSON.stringify({}),
      }),
    ).rejects.toThrow("assistant-ui package does not expose a binary");
  });
});

describe("delegateToAssistantUiCreate", () => {
  it("delegates to assistant-ui create via the installed binary", async () => {
    const runSpawnCommand =
      vi.fn<(command: string, args: string[]) => Promise<void>>();
    runSpawnCommand.mockResolvedValue();

    await delegateToAssistantUiCreate({
      commandArgs: ["my-app", "--template", "cloud"],
      resolveBinPath: async () =>
        "/tmp/node_modules/assistant-ui/dist/index.js",
      runSpawnCommand,
    });

    expect(runSpawnCommand).toHaveBeenCalledWith(process.execPath, [
      "/tmp/node_modules/assistant-ui/dist/index.js",
      "create",
      "my-app",
      "--template",
      "cloud",
    ]);
  });
});
