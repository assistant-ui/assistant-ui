import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { blockDependencies, readBlockFiles } from "./block-source";

describe("readBlockFiles", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "block-source-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function write(files: Record<string, string>) {
    for (const [filePath, contents] of Object.entries(files)) {
      const target = path.join(root, filePath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, contents);
    }
  }

  it("reads the listed folders in full and the listed root files", async () => {
    await write({
      "app/page.tsx": "export default function Page() {}\n",
      "app/api/chat/route.ts": "export async function POST() {}\n",
      "lib/blocks.test.ts": "it('works', () => {});\n",
      "package.json": "{}\n",
      "README.md": "# Not listed\n",
    });

    const files = await readBlockFiles(root, ["app", "lib", "package.json"]);

    expect(files).toEqual([
      {
        path: "app/api/chat/route.ts",
        code: "export async function POST() {}",
      },
      { path: "app/page.tsx", code: "export default function Page() {}" },
      { path: "lib/blocks.test.ts", code: "it('works', () => {});" },
      { path: "package.json", code: "{}" },
    ]);
  });

  it("never returns a key file, even when one is listed", async () => {
    await write({
      ".env": "OPENAI_API_KEY=sk-root\n",
      ".env.local": "OPENAI_API_KEY=sk-local\n",
      ".env.example": "OPENAI_API_KEY=\n",
      "app/.env.local": "OPENAI_API_KEY=sk-nested\n",
      "app/page.tsx": "export default function Page() {}\n",
    });

    const files = await readBlockFiles(root, [
      "app",
      ".env",
      ".env.local",
      ".env.example",
    ]);

    expect(files.map((file) => file.path)).toEqual([
      ".env.example",
      "app/page.tsx",
    ]);
  });

  it("leaves out installed packages, build output and binary assets", async () => {
    await write({
      "app/page.tsx": "export default function Page() {}\n",
      "app/favicon.ico": "\u0000\u0001",
      "app/node_modules/pkg/index.js": "module.exports = {};\n",
      "app/.next/server/page.js": "module.exports = {};\n",
    });

    const files = await readBlockFiles(root, ["app"]);

    expect(files.map((file) => file.path)).toEqual(["app/page.tsx"]);
  });
});

describe("blockDependencies", () => {
  it("lists what the block installs at runtime, as its manifest declares it", () => {
    const manifest = JSON.stringify({
      dependencies: {
        lexical: "^0.53.0",
        "@assistant-ui/react": "workspace:*",
      },
      devDependencies: { vitest: "^5.0.5" },
    });

    expect(
      blockDependencies([{ path: "package.json", code: manifest }]),
    ).toEqual([
      { name: "lexical", range: "^0.53.0" },
      { name: "@assistant-ui/react", range: "workspace:*" },
    ]);
  });

  it("lists nothing for a block without a manifest", () => {
    expect(
      blockDependencies([{ path: "app/page.tsx", code: "export {};" }]),
    ).toEqual([]);
  });
});
