import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  blockAssistantUi,
  blockDependencies,
  blockElements,
  publishedDependencies,
  readBlockFiles,
} from "./block-source";

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

  it("lists the packages a block without a manifest imports, at the given ranges", () => {
    const code = [
      'import { useState } from "react";',
      'import { ThreadPrimitive } from "@assistant-ui/react";',
      'import { PlusIcon } from "lucide-react/icons";',
      'import { cn } from "@/lib/utils";',
      'import { helper } from "./helper";',
    ].join("\n");

    expect(
      blockDependencies([{ path: "chat.tsx", code }], {
        react: "^19.3.1",
        "@assistant-ui/react": "workspace:*",
        next: "^16.0.0",
      }),
    ).toEqual([
      { name: "@assistant-ui/react", range: "workspace:*" },
      { name: "lucide-react", range: "" },
      { name: "react", range: "^19.3.1" },
    ]);
  });

  it("leaves out the packages only its tests import", () => {
    expect(
      blockDependencies([
        { path: "lib/document.ts", code: 'import { z } from "zod";' },
        {
          path: "lib/document.test.ts",
          code: 'import { it } from "vitest";\nimport { z } from "zod";',
        },
      ]),
    ).toEqual([{ name: "zod", range: "" }]);
  });

  it("lists nothing for a block without a manifest or imports", () => {
    expect(
      blockDependencies([{ path: "app/page.tsx", code: "export {};" }]),
    ).toEqual([]);
  });
});

describe("publishedDependencies", () => {
  let modulesRoot: string;

  beforeEach(async () => {
    modulesRoot = await mkdtemp(path.join(tmpdir(), "block-modules-"));
  });

  afterEach(async () => {
    await rm(modulesRoot, { recursive: true, force: true });
  });

  it("swaps a workspace range for a caret range on the version the package publishes", async () => {
    await mkdir(path.join(modulesRoot, "@assistant-ui/react"), {
      recursive: true,
    });
    await writeFile(
      path.join(modulesRoot, "@assistant-ui/react/package.json"),
      JSON.stringify({ name: "@assistant-ui/react", version: "0.14.2" }),
    );

    expect(
      await publishedDependencies(
        [
          { name: "@assistant-ui/react", range: "workspace:*" },
          { name: "react", range: "^19.3.1" },
        ],
        modulesRoot,
      ),
    ).toEqual([
      { name: "@assistant-ui/react", range: "^0.14.2" },
      { name: "react", range: "^19.3.1" },
    ]);
  });
});

describe("blockAssistantUi", () => {
  it("lists what the files import from assistant-ui, with kinds, parts and files", () => {
    const imports = blockAssistantUi([
      {
        path: "components/chat.tsx",
        code: [
          'import { useState } from "react";',
          "import {",
          "  ThreadPrimitive,",
          "  useAuiState,",
          "  AuiIf,",
          "  type ToolCallMessagePartComponent,",
          '} from "@assistant-ui/react";',
          'import { QuoteBlock } from "@/components/assistant-ui/elements/quote.aui";',
          'import { Button } from "@/components/ui/button";',
          "export const Chat = () => (",
          "  <ThreadPrimitive.Root><ThreadPrimitive.Viewport /></ThreadPrimitive.Root>",
          ");",
        ].join("\n"),
      },
      {
        path: "app/page.tsx",
        code: [
          'import { useAuiState } from "@assistant-ui/react";',
          'import type { FrontendTools } from "@assistant-ui/ai-sdk";',
        ].join("\n"),
      },
    ]);

    expect(imports).toEqual([
      {
        name: "QuoteBlock",
        source: "@/components/assistant-ui/elements/quote.aui",
        kind: "component",
        parts: [],
        files: ["components/chat.tsx"],
      },
      {
        name: "FrontendTools",
        source: "@assistant-ui/ai-sdk",
        kind: "type",
        parts: [],
        files: ["app/page.tsx"],
      },
      {
        name: "AuiIf",
        source: "@assistant-ui/react",
        kind: "runtime",
        parts: [],
        files: ["components/chat.tsx"],
      },
      {
        name: "ThreadPrimitive",
        source: "@assistant-ui/react",
        kind: "primitive",
        parts: ["Root", "Viewport"],
        files: ["components/chat.tsx"],
      },
      {
        name: "ToolCallMessagePartComponent",
        source: "@assistant-ui/react",
        kind: "type",
        parts: [],
        files: ["components/chat.tsx"],
      },
      {
        name: "useAuiState",
        source: "@assistant-ui/react",
        kind: "hook",
        parts: [],
        files: ["components/chat.tsx", "app/page.tsx"],
      },
    ]);
  });

  it("finds nothing in files that import nothing from assistant-ui", () => {
    expect(
      blockAssistantUi([
        { path: "lib/utils.ts", code: 'import { clsx } from "clsx";' },
      ]),
    ).toEqual([]);
  });
});

const CATALOG = [
  { slug: "message-pair" },
  { slug: "composer" },
  { slug: "composer-voice" },
  { slug: "thread" },
  { slug: "quote", file: "quote.aui.tsx" },
  { slug: "unused" },
];

describe("blockElements", () => {
  it("lists primitives the source renders, in catalog order", () => {
    expect(
      blockElements(
        [
          {
            path: "components/chat.tsx",
            code: [
              "<ThreadPrimitive.Root />",
              "<ComposerPrimitive.Dictate />",
              "<ThreadPrimitive.Suggestions />",
            ].join("\n"),
          },
        ],
        CATALOG,
      ),
    ).toEqual([
      {
        slug: "composer",
        kind: "primitive",
        names: ["ComposerPrimitive"],
      },
      {
        slug: "composer-voice",
        kind: "primitive",
        names: ["ComposerPrimitive.Dictate"],
      },
      { slug: "thread", kind: "primitive", names: ["ThreadPrimitive"] },
    ]);
  });

  it("counts an imported element file as the element, not the primitive", () => {
    expect(
      blockElements(
        [
          {
            path: "components/chat.tsx",
            code: [
              'import { Quote } from "@/components/assistant-ui/elements/quote.aui";',
              "<SelectionToolbarPrimitive.Quote />",
            ].join("\n"),
          },
        ],
        CATALOG,
      ),
    ).toEqual([{ slug: "quote", kind: "element", names: ["quote.aui"] }]);
  });

  it("assigns a shared element file to its first catalog entry", () => {
    expect(
      blockElements(
        [
          {
            path: "components/chat.tsx",
            code: 'import { Composer } from "@/components/assistant-ui/elements/composer";',
          },
        ],
        [
          { slug: "composer", file: "composer.tsx" },
          { slug: "composer-voice", file: "composer.tsx" },
        ],
      ),
    ).toEqual([{ slug: "composer", kind: "element", names: ["composer"] }]);
  });

  it("ignores primitive mentions in non-code files", () => {
    expect(
      blockElements(
        [{ path: "README.md", code: "Use ThreadPrimitive to render threads." }],
        [{ slug: "thread" }],
      ),
    ).toEqual([]);
  });

  it("ignores test files and elements outside the catalog", () => {
    expect(
      blockElements(
        [
          {
            path: "chat.test.tsx",
            code: "<ThreadPrimitive.Root />",
          },
          {
            path: "components/chat.tsx",
            code: "<MessagePrimitive.Root />",
          },
        ],
        [{ slug: "thread" }],
      ),
    ).toEqual([]);
  });
});
