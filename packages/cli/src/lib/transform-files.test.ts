import { describe, expect, it, onTestFinished } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { getRelevantFiles, countFilesToProcess } from "./transform";

const fixture = () => {
  const directory = mkdtempSync(join(tmpdir(), "aui-transform-files-"));
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  const write = (
    name: string,
    source = 'import { useAssistantApi } from "@assistant-ui/react";',
  ) => {
    const file = join(directory, name);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, source);
    return file;
  };
  return { directory, write };
};

describe("codemod file discovery", () => {
  it.each(["js", "jsx", "ts", "tsx"])(
    "accepts an explicit .%s target",
    (extension) => {
      const { write } = fixture();
      const file = write(`my app.${extension}`);
      expect(getRelevantFiles(file)).toEqual([file]);
      expect(countFilesToProcess(file)).toBe(1);
      expect(getRelevantFiles(relative(process.cwd(), file))).toEqual([file]);
    },
  );

  it("keeps directory discovery filters", () => {
    const { directory, write } = fixture();
    const wanted = write("src/app.tsx");
    for (const file of [
      "node_modules/dependency.ts",
      "dist/index.js",
      "build/app.js",
      "app.min.js",
      "app.bundle.js",
      "README.md",
    ])
      write(file);
    write("unrelated.ts", "export const value = 1;");
    expect(getRelevantFiles(directory)).toEqual([wanted]);
  });

  it("skips unrelated and unsupported explicit files", () => {
    const { write } = fixture();
    expect(
      getRelevantFiles(write("unrelated.ts", "export const value = 1;")),
    ).toEqual([]);
    expect(getRelevantFiles(write("README.md"))).toEqual([]);
  });

  it("rejects a missing target rather than silently reporting no work", () => {
    const { directory } = fixture();
    expect(() => getRelevantFiles(join(directory, "missing.tsx"))).toThrow(
      /ENOENT/,
    );
  });
});
