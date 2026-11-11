import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runSpawn = vi.hoisted(() => vi.fn());
vi.mock("./run-spawn", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./run-spawn")>()),
  runSpawn,
}));

import { formatProject, resolveFormatCommand } from "./create-project";
import { SpawnExitError, SpawnSignalError } from "./run-spawn";

const templatesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../templates",
);

describe("formatProject", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "aui-cli-format-"));
    runSpawn.mockReset();
  });

  afterEach(() => {
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  const writePackageJson = (scripts: Record<string, string>) =>
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({ name: "app", scripts }),
    );

  it("runs the project's format:fix script with the chosen package manager", async () => {
    writePackageJson({ "format:fix": "oxfmt" });

    await formatProject(projectDir, "pnpm");

    expect(runSpawn).toHaveBeenCalledWith(
      "pnpm",
      ["run", "format:fix"],
      projectDir,
    );
  });

  it("skips projects without a format:fix script", async () => {
    writePackageJson({ lint: "eslint ." });

    await formatProject(projectDir, "npm");

    expect(runSpawn).not.toHaveBeenCalled();
    expect(resolveFormatCommand(projectDir, "npm")).toBeUndefined();
  });

  it("skips projects without a package.json", async () => {
    await formatProject(projectDir, "npm");

    expect(runSpawn).not.toHaveBeenCalled();
  });

  it("only warns when the formatter exits non-zero", async () => {
    writePackageJson({ "format:fix": "oxfmt" });
    runSpawn.mockRejectedValueOnce(new SpawnExitError(2));

    await expect(formatProject(projectDir, "npm")).resolves.toBeUndefined();
  });

  it("rethrows signal interruptions", async () => {
    writePackageJson({ "format:fix": "oxfmt" });
    runSpawn.mockRejectedValueOnce(new SpawnSignalError("SIGINT", false));

    await expect(formatProject(projectDir, "npm")).rejects.toBeInstanceOf(
      SpawnSignalError,
    );
  });
});

describe("templates", () => {
  const templates = fs
    .readdirSync(templatesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => {
      const pkgPath = path.join(templatesDir, name, "package.json");
      return (
        fs.existsSync(pkgPath) &&
        fs.readFileSync(pkgPath, "utf-8").includes("oxfmt")
      );
    });

  it("finds the oxfmt templates", () => {
    expect(templates).toContain("default");
  });

  it.each(templates)(
    "%s ships its own oxfmt config and a format:fix script",
    (name) => {
      const dir = path.join(templatesDir, name);
      // Without a config, oxfmt falls back to its defaults in a fresh
      // project and `lint` (oxfmt --check) fails on every file.
      expect(fs.existsSync(path.join(dir, ".oxfmtrc.json"))).toBe(true);
      const pkg = JSON.parse(
        fs.readFileSync(path.join(dir, "package.json"), "utf-8"),
      );
      expect(pkg.scripts["format:fix"]).toBe("oxfmt");
    },
  );

  it.each(templates)("%s oxfmt config matches the default template", (name) => {
    const read = (template: string) =>
      fs.readFileSync(
        path.join(templatesDir, template, ".oxfmtrc.json"),
        "utf-8",
      );
    expect(read(name)).toBe(read("default"));
  });
});
