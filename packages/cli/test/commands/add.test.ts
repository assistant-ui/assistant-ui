import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
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
      }),
    ).toEqual({
      command: "npx",
      args: [
        "--yes",
        "shadcn@latest",
        "add",
        "https://r.assistant-ui.com/base/thread.json",
        "--yes",
      ],
    });
  });

  it("uses pnpm dlx for pnpm", () => {
    expect(
      createAddComponentsPlan({
        components: ["thread", "markdown-text"],
        packageManager: "pnpm",
        overwrite: true,
        path: "components/assistant-ui",
      }),
    ).toEqual({
      command: "pnpm",
      args: [
        "dlx",
        "shadcn@latest",
        "add",
        "https://r.assistant-ui.com/base/thread.json",
        "https://r.assistant-ui.com/base/markdown-text.json",
        "--overwrite",
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
        "https://r.assistant-ui.com/base/thread.json",
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

describe("add directory selection", () => {
  let root: string;
  let projectDir: string;
  let binDir: string;
  let recordPath: string;
  let originalCwd: string;
  let originalPath: string | undefined;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit(${String(code)})`);
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  beforeAll(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "aui-add-")));
    projectDir = path.join(root, "app");
    binDir = path.join(root, "bin");
    recordPath = path.join(root, "record.json");

    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, "package.json"), "{}");
    fs.writeFileSync(
      path.join(projectDir, "components.json"),
      JSON.stringify({ style: "new-york" }),
    );

    const shim = path.join(binDir, "npx");
    fs.writeFileSync(
      shim,
      `#!/usr/bin/env node\nrequire("node:fs").writeFileSync(${JSON.stringify(recordPath)}, JSON.stringify({ cwd: require("node:fs").realpathSync(process.cwd()), argv: process.argv.slice(2) }));\n`,
    );
    fs.chmodSync(shim, 0o755);

    originalCwd = process.cwd();
    originalPath = process.env["PATH"];
    process.chdir(root);
    process.env["PATH"] = `${binDir}${path.delimiter}${originalPath ?? ""}`;
  });

  afterAll(() => {
    process.chdir(originalCwd);
    process.env["PATH"] = originalPath ?? "";
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("resolves a relative directory once, against the caller", async () => {
    await add.parseAsync(["thread", "--cwd", "app", "--use-npm"], {
      from: "user",
    });

    const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
    // shadcn resolves its own `--cwd` against `process.cwd()`, defaulting to it,
    // so this is the directory it operates on.
    const flag = record.argv.indexOf("--cwd");
    const target =
      flag === -1
        ? record.cwd
        : path.resolve(record.cwd, record.argv[flag + 1] as string);

    expect(target).toBe(projectDir);
  });
});
