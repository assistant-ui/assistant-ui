import { describe, expect, it } from "vitest";
import { add, createAddComponentsPlan } from "../../src/commands/add";

describe("add command", () => {
  it("exposes package manager override options", () => {
    expect(
      add.options.find((option) => option.long === "--use-npm"),
    ).toBeDefined();
    expect(
      add.options.find((option) => option.long === "--use-pnpm"),
    ).toBeDefined();
    expect(
      add.options.find((option) => option.long === "--use-yarn"),
    ).toBeDefined();
    expect(
      add.options.find((option) => option.long === "--use-bun"),
    ).toBeDefined();
  });
});

describe("createAddComponentsPlan", () => {
  it("uses npx --yes for npm", () => {
    expect(
      createAddComponentsPlan({
        components: ["thread"],
        packageManager: "npm",
        yes: true,
        cwd: "/repo",
      }),
    ).toEqual({
      command: "npx",
      args: [
        "--yes",
        "shadcn@latest",
        "add",
        "https://r.assistant-ui.com/thread.json",
        "--yes",
        "--cwd",
        "/repo",
      ],
    });
  });

  it("uses pnpm dlx for pnpm", () => {
    expect(
      createAddComponentsPlan({
        components: ["thread", "markdown-text"],
        packageManager: "pnpm",
        overwrite: true,
        cwd: "/repo",
        path: "components/assistant-ui",
      }),
    ).toEqual({
      command: "pnpm",
      args: [
        "dlx",
        "shadcn@latest",
        "add",
        "https://r.assistant-ui.com/thread.json",
        "https://r.assistant-ui.com/markdown-text.json",
        "--overwrite",
        "--cwd",
        "/repo",
        "--path",
        "components/assistant-ui",
      ],
    });
  });

  it("uses bunx for bun", () => {
    expect(
      createAddComponentsPlan({
        components: ["thread"],
        packageManager: "bun",
      }),
    ).toEqual({
      command: "bunx",
      args: [
        "shadcn@latest",
        "add",
        "https://r.assistant-ui.com/thread.json",
      ],
    });
  });

  it("rejects invalid component names", () => {
    expect(() =>
      createAddComponentsPlan({
        components: ["../thread"],
        packageManager: "pnpm",
      }),
    ).toThrow("Invalid component name: ../thread");
  });
});
