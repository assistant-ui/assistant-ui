import { execFileSync } from "node:child_process";
import {
  closeSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";

let root: string;
let styles: string;
let output: string;
const previous = 'export const panelCss = "previous";\n';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "panel-styles-"));
  styles = join(root, "src/styles");
  output = join(styles, "panel.generated.ts");
  mkdirSync(styles, { recursive: true });
  writeFileSync(output, previous);
  mkdirSync(join(root, "scripts"));
  copyFileSync(
    new URL("../../scripts/build-styles.mjs", import.meta.url),
    join(root, "scripts/build-styles.mjs"),
  );
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function build(cli: string) {
  const pkg = join(root, "node_modules/@tailwindcss/cli");
  mkdirSync(pkg, { recursive: true });
  writeFileSync(join(pkg, "package.json"), JSON.stringify({ bin: "cli.cjs" }));
  writeFileSync(
    join(pkg, "cli.cjs"),
    `
    const fs = require("node:fs");
    const output = process.argv[process.argv.indexOf("-o") + 1];
    ${cli}
  `,
  );
  execFileSync(process.execPath, ["scripts/build-styles.mjs"], {
    cwd: root,
    stdio: "pipe",
  });
}

it("keeps the complete previous module available to an open reader", () => {
  const reader = openSync(output, "r");
  try {
    build('fs.writeFileSync(output, ":root{color:red}");');
    expect(readFileSync(reader, "utf8")).toBe(previous);
    expect(readFileSync(output, "utf8")).toContain(
      'export const panelCss = ":host{color:red}";',
    );
  } finally {
    closeSync(reader);
  }
});

it("publishes each writer's own CSS when another build finishes mid-compile", () => {
  build(`
    const nested = fs.existsSync("outer-started");
    fs.writeFileSync(output, nested ? ".inner{}" : ".outer{}");
    if (!nested) {
      fs.writeFileSync("outer-started", "");
      require("node:child_process").execFileSync(process.execPath, ["scripts/build-styles.mjs"]);
      fs.copyFileSync("src/styles/panel.generated.ts", "inner-result");
    }
  `);
  expect(readFileSync(join(root, "inner-result"), "utf8")).toContain(
    'export const panelCss = ".inner{}";',
  );
  expect(readFileSync(output, "utf8")).toContain(
    'export const panelCss = ".outer{}";',
  );
  expect(readdirSync(styles)).toEqual(["panel.generated.ts"]);
});

it("preserves the published module and cleans up after a compiler failure", () => {
  expect(() =>
    build(
      'fs.writeFileSync(output, "partial"); throw Error("compile failed");',
    ),
  ).toThrow(/compile failed/);
  expect(readFileSync(output, "utf8")).toBe(previous);
  expect(readdirSync(styles)).toEqual(["panel.generated.ts"]);
});
