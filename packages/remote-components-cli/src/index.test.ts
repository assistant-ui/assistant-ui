import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main, resolveEntry } from "./index.js";

const RATING = `type Props = { value?: number };
export default function Rating({ value = 0 }: Props) {
  return <div className="stars">{[1, 2, 3].map((n) => <button key={n}>{n <= value ? "on" : "off"}</button>)}<span>rating-markup</span></div>;
}
`;

let dir: string;
const write = async (file: string, text: string) => {
  await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
  writeFileSync(path.join(dir, file), text);
};
const run = (...argv: string[]) => main(argv, dir);
let errors: string[];

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "rc-cli-"));
  errors = [];
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation((m: unknown) => {
    errors.push(String(m));
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

describe("remote-components build", () => {
  it("builds a file to dist/<name>.html with the runtime and the component inlined", async () => {
    await write("rating.tsx", RATING);
    expect(await run("build", "rating.tsx")).toBe(0);
    const out = path.join(dir, "dist/rating.html");
    const html = readFileSync(out, "utf8");
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain("<title>rating</title>");
    expect(html).toContain("<script data-rc-runtime>");
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain("rating-markup");
    expect(html).toMatch(/className:.stars./);
    expect(html).not.toMatch(/<script[^>]+src=/);
  });

  it("builds the index file when no entry is given", async () => {
    await write("index.ts", `export default function App() { return null; }\n`);
    await write("index.tsx", RATING);
    expect(await run("build")).toBe(0);
    expect(readFileSync(path.join(dir, "dist/index.html"), "utf8")).toContain(
      "rating-markup",
    );
  });

  it("writes to --out and resolves tsconfig paths and CSS imports", async () => {
    await write(
      "tsconfig.json",
      JSON.stringify({
        compilerOptions: { jsx: "react-jsx", paths: { "@lib/*": ["./lib/*"] } },
      }),
    );
    await write("lib/label.ts", `export const label = "from-paths";\n`);
    await write("lib/card.css", `.card { color: rebeccapurple; }\n`);
    await write(
      "src/card.tsx",
      `import { label } from "@lib/label";\nimport "../lib/card.css";\nexport default () => <p className="card">{label}</p>;\n`,
    );
    expect(
      await run("build", "src/card.tsx", "--out", "public/card.html"),
    ).toBe(0);
    const html = readFileSync(path.join(dir, "public/card.html"), "utf8");
    expect(html).toContain("from-paths");
    expect(html).toContain("<style>.card{color:#639}");
  });

  it("fails clearly when there is no component", async () => {
    expect(await run("build")).toBe(1);
    expect(errors.join("\n")).toMatch(/No component found.*index\.tsx/);
    expect(await run("build", "missing.tsx")).toBe(1);
    expect(errors.join("\n")).toContain("No such file: missing.tsx");
    await write("helpers.ts", `export const x = 1;\n`);
    expect(await run("build", "helpers.ts")).toBe(1);
    expect(errors.join("\n")).toContain("helpers.ts has no default export");
    expect(existsSync(path.join(dir, "dist"))).toBe(false);
  });

  it("rejects unknown commands and prints usage", async () => {
    expect(await run("bundle")).toBe(1);
    expect(errors.join("\n")).toContain("Unknown command: bundle");
    expect(await run("--help")).toBe(0);
    expect(await run()).toBe(1);
  });

  it("prefers the explicit entry in resolveEntry", async () => {
    await write("index.tsx", RATING);
    await write("other.jsx", RATING);
    expect(resolveEntry(dir)).toBe(path.join(dir, "index.tsx"));
    expect(resolveEntry(dir, "other.jsx")).toBe(path.join(dir, "other.jsx"));
  });
});
