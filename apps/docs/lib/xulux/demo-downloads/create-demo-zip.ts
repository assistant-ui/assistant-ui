import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  DEMO_DOWNLOAD_MANIFESTS,
  getDemoDownloadManifest,
  type DemoDownloadManifest,
  type DemoDownloadSlug,
} from "./manifest";
import {
  DEMO_DEPENDENCIES,
  DEMO_DEV_DEPENDENCIES,
  dependencyVersionsFromPackage,
  dependencyVersions,
} from "./package-versions";
import { createZip, type ZipFileMap } from "./zip";

type SourceSnapshot = Record<string, string>;

export async function loadSourceSnapshot(snapshotPath = defaultSnapshotPath()) {
  const raw = await readFile(snapshotPath, "utf8");
  return JSON.parse(raw) as SourceSnapshot;
}

export async function createDemoZip(slug: string) {
  const snapshot = await loadSourceSnapshot();
  return createZip(createDemoFileMap(slug, snapshot));
}

export function createDemoFileMap(slug: string, snapshot: SourceSnapshot) {
  const manifest = getDemoDownloadManifest(slug);
  if (!manifest) {
    throw new Error(`Unsupported demo slug: ${slug}`);
  }

  if (manifest.target === "node-cli") {
    return createNodeCliDemoFileMap(manifest, snapshot);
  }

  const demoSource = assertSnapshotFile(snapshot, manifest.entry);
  const files: ZipFileMap = {
    "package.json": packageJson(manifest, snapshot),
    "next.config.ts": nextConfigTs(),
    "tsconfig.json": tsconfigJson(),
    "postcss.config.mjs": postcssConfigMjs(),
    "README.md": readme(manifest),
    ".env.example": "OPENAI_API_KEY=\n",
    "app/globals.css": globalsCss(),
    "app/layout.tsx": layoutTsx(manifest),
    "app/page.tsx": pageTsx(manifest),
    "app/api/chat/route.ts": chatRouteTs(),
    "components/runtime/demo-runtime-provider.tsx": runtimeProviderTsx(),
    "components/assistant-ui/markdown-text.tsx": markdownTextShim(),
    "components/assistant-ui/shiki-highlighter.tsx": shikiHighlighterShim(),
    "components/assistant-ui/tool-fallback.tsx": toolFallbackShim(),
    "components/assistant-ui/tooltip-icon-button.tsx": tooltipIconButtonShim(),
    "components/docs/assistant/docs-model-options.ts": docsModelOptionsShim(),
    "constants/model.ts": 'export const DEFAULT_MODEL_ID = "gpt-4.1-mini";\n',
    "public/favicon/icon.svg": faviconSvg(),
    [`components/examples/${manifest.slug}.tsx`]: demoSource,
  };

  for (const sourceFile of manifest.extraSourceFiles ?? []) {
    files[targetPathForSourceFile(sourceFile)] = assertSnapshotFile(
      snapshot,
      sourceFile,
    );
  }

  return files;
}

export function getDemoArchiveFilename(slug: DemoDownloadSlug) {
  return `xulux-${slug}-demo.zip`;
}

export function supportedDemoSlugs() {
  return Object.keys(DEMO_DOWNLOAD_MANIFESTS) as DemoDownloadSlug[];
}

function defaultSnapshotPath() {
  return path.join(process.cwd(), "generated", "source-snapshot.json");
}

function assertSnapshotFile(snapshot: SourceSnapshot, snapshotKey: string) {
  const contents = snapshot[snapshotKey];
  if (typeof contents !== "string") {
    throw new Error(`Missing source snapshot entry: ${snapshotKey}`);
  }
  return contents;
}

function targetPathForSourceFile(sourceFile: string) {
  if (sourceFile.startsWith("packages/ui/src/")) {
    return sourceFile
      .replace(/^packages\/ui\/src\//, "")
      .replace(/^components\/ui\/radix\//, "components/ui/")
      .replace(/^components\/ui\/base\//, "components/ui/")
      .replace(/^components\/assistant-ui\//, "components/assistant-ui/")
      .replace(/^lib\//, "lib/");
  }

  if (sourceFile.startsWith("apps/docs/")) {
    return sourceFile.replace(/^apps\/docs\//, "");
  }

  throw new Error(`Unsupported demo source path: ${sourceFile}`);
}

const REACT_INK_SOURCE_FILES = [
  "examples/with-react-ink/src/app.tsx",
  "examples/with-react-ink/src/components/thread.tsx",
  "examples/with-react-ink/src/dev.ts",
  "examples/with-react-ink/src/index.tsx",
  "examples/with-react-ink/src/scripted-adapter.ts",
  "examples/with-react-ink/src/tools.tsx",
] as const;

function createNodeCliDemoFileMap(
  manifest: DemoDownloadManifest,
  snapshot: SourceSnapshot,
) {
  if (manifest.slug !== "react-ink") {
    throw new Error(`Unsupported node-cli demo slug: ${manifest.slug}`);
  }

  const files: ZipFileMap = {
    "package.json": nodeCliPackageJson(manifest, snapshot),
    "tsconfig.json": assertSnapshotFile(
      snapshot,
      "examples/with-react-ink/tsconfig.json",
    ),
    "README.md": nodeCliReadme(manifest),
  };

  for (const sourceFile of REACT_INK_SOURCE_FILES) {
    files[sourceFile.replace(/^examples\/with-react-ink\//, "")] =
      assertSnapshotFile(snapshot, sourceFile);
  }

  return files;
}

function nodeCliPackageJson(
  manifest: DemoDownloadManifest,
  snapshot: SourceSnapshot,
) {
  const packagePath = "examples/with-react-ink/package.json";
  const dependencies = dependencyVersionsFromPackage(snapshot, packagePath, [
    "@assistant-ui/react-ink",
    "@assistant-ui/react-ink-markdown",
    "ink",
    "react",
  ]);
  const devDependencies = dependencyVersionsFromPackage(snapshot, packagePath, [
    "@types/react",
    "esbuild",
    "tsx",
    "typescript",
  ]);

  return `${JSON.stringify(
    {
      name: `xulux-${manifest.slug}-demo`,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: "node --import tsx/esm src/dev.ts",
        build: "tsc",
        start: "node dist/index.js",
      },
      dependencies,
      devDependencies,
    },
    null,
    2,
  )}\n`;
}

function nodeCliReadme(manifest: DemoDownloadManifest) {
  return `# Xulux ${manifest.name}\n\n${manifest.description}\n\nThis is a Node.js terminal app. It renders a Claude Code or Codex CLI-style assistant UI with React Ink and assistant-ui terminal primitives.\n\n## Run\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Build\n\n\`\`\`bash\nnpm run build\nnpm start\n\`\`\`\n\nSource demo: \`${manifest.sourcePath ?? "examples/with-react-ink"}\`\n`;
}

function packageJson(manifest: DemoDownloadManifest, snapshot: SourceSnapshot) {
  return `${JSON.stringify(
    {
      name: `xulux-${manifest.slug}-demo`,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
      },
      dependencies: dependencyVersions(snapshot, DEMO_DEPENDENCIES),
      devDependencies: dependencyVersions(snapshot, DEMO_DEV_DEPENDENCIES),
    },
    null,
    2,
  )}\n`;
}

function nextConfigTs() {
  return 'import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = {};\n\nexport default nextConfig;\n';
}

function tsconfigJson() {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: false,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
        paths: {
          "@/*": ["./*"],
        },
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    },
    null,
    2,
  )}\n`;
}

function postcssConfigMjs() {
  return 'const config = { plugins: { "@tailwindcss/postcss": {} } };\n\nexport default config;\n';
}

function readme(manifest: DemoDownloadManifest) {
  return `# Xulux ${manifest.name}\n\n${manifest.description}\n\n## Run\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\nAdd \`OPENAI_API_KEY\` to \`.env.local\` for live AI responses. Without a key, \`app/api/chat/route.ts\` returns a deterministic fallback response so the demo still runs locally.\n\nSource demo: \`${manifest.entry}\`\n`;
}

function globalsCss() {
  return `@import "tailwindcss";\n\n@theme inline {\n  --color-background: var(--background);\n  --color-foreground: var(--foreground);\n  --color-muted: var(--muted);\n  --color-muted-foreground: var(--muted-foreground);\n  --color-border: var(--border);\n  --color-input: var(--input);\n  --color-ring: var(--ring);\n  --color-primary: var(--primary);\n  --color-primary-foreground: var(--primary-foreground);\n  --color-accent: var(--accent);\n  --color-accent-foreground: var(--accent-foreground);\n  --color-popover: var(--popover);\n  --color-popover-foreground: var(--popover-foreground);\n}\n\n:root {\n  --background: #ffffff;\n  --foreground: #171717;\n  --muted: #f4f4f5;\n  --muted-foreground: #71717a;\n  --border: #e4e4e7;\n  --input: #e4e4e7;\n  --ring: #18181b;\n  --primary: #18181b;\n  --primary-foreground: #fafafa;\n  --accent: #f4f4f5;\n  --accent-foreground: #18181b;\n  --popover: #ffffff;\n  --popover-foreground: #18181b;\n}\n\n.dark {\n  --background: #09090b;\n  --foreground: #fafafa;\n  --muted: #27272a;\n  --muted-foreground: #a1a1aa;\n  --border: #27272a;\n  --input: #27272a;\n  --ring: #fafafa;\n  --primary: #fafafa;\n  --primary-foreground: #18181b;\n  --accent: #27272a;\n  --accent-foreground: #fafafa;\n  --popover: #18181b;\n  --popover-foreground: #fafafa;\n}\n\nhtml, body {\n  height: 100%;\n}\n\nbody {\n  margin: 0;\n  background: var(--background);\n  color: var(--foreground);\n}\n\nbutton, input, textarea, select {\n  font: inherit;\n}\n`;
}

function layoutTsx(manifest: DemoDownloadManifest) {
  return `import type { Metadata } from "next";\nimport "./globals.css";\n\nexport const metadata: Metadata = {\n  title: "${manifest.name}",\n  description: "Downloadable assistant-ui demo starter generated by Xulux.",\n};\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en" suppressHydrationWarning>\n      <body>{children}</body>\n    </html>\n  );\n}\n`;
}

function pageTsx(manifest: DemoDownloadManifest) {
  return `import { DemoRuntimeProvider } from "@/components/runtime/demo-runtime-provider";\nimport { ${manifest.componentName} } from "@/components/examples/${manifest.slug}";\n\nexport default function Page() {\n  return (\n    <main className="h-dvh overflow-hidden">\n      <DemoRuntimeProvider>\n        <${manifest.componentName} />\n      </DemoRuntimeProvider>\n    </main>\n  );\n}\n`;
}

function runtimeProviderTsx() {
  return `"use client";\n\nimport { AssistantRuntimeProvider } from "@assistant-ui/react";\nimport { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk";\n\nexport function DemoRuntimeProvider({ children }: { children: React.ReactNode }) {\n  const runtime = useChatRuntime({\n    transport: new AssistantChatTransport({ api: "/api/chat" }),\n  });\n\n  return (\n    <AssistantRuntimeProvider runtime={runtime}>\n      {children}\n    </AssistantRuntimeProvider>\n  );\n}\n`;
}

function chatRouteTs() {
  return `import { openai } from "@ai-sdk/openai";\nimport {\n  convertToModelMessages,\n  createUIMessageStream,\n  createUIMessageStreamResponse,\n  streamText,\n} from "ai";\n\nexport const maxDuration = 30;\n\nexport async function POST(req: Request) {\n  const { messages } = await req.json();\n\n  if (!process.env.OPENAI_API_KEY) {\n    const stream = createUIMessageStream({\n      originalMessages: messages,\n      execute: async ({ writer }) => {\n        const messageId = \`msg-\${crypto.randomUUID()}\`;\n        const textId = "fallback-text";\n\n        writer.write({ type: "start", messageId });\n        writer.write({ type: "start-step" });\n        writer.write({ type: "text-start", id: textId });\n        writer.write({\n          type: "text-delta",\n          id: textId,\n          delta:\n            "This starter is running without OPENAI_API_KEY. Add one to .env.local to enable live AI responses.",\n        });\n        writer.write({ type: "text-end", id: textId });\n        writer.write({ type: "finish-step" });\n        writer.write({ type: "finish" });\n      },\n    });\n\n    return createUIMessageStreamResponse({ stream });\n  }\n\n  const result = streamText({\n    model: openai("gpt-4.1-mini"),\n    messages: await convertToModelMessages(messages),\n  });\n\n  return result.toUIMessageStreamResponse();\n}\n`;
}

function markdownTextShim() {
  return `"use client";\n\nimport { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";\nimport remarkGfm from "remark-gfm";\n\nexport function MarkdownText() {\n  return <MarkdownTextPrimitive remarkPlugins={[remarkGfm]} className="aui-md" />;\n}\n`;
}

function shikiHighlighterShim() {
  return `"use client";\n\nexport function SyntaxHighlighter({ code }: { code?: string }) {\n  return <pre className="overflow-auto rounded-md bg-muted p-3 text-sm"><code>{code}</code></pre>;\n}\n`;
}

function toolFallbackShim() {
  return `"use client";\n\nimport type { ToolCallMessagePartComponent } from "@assistant-ui/react";\n\nexport const ToolFallback: ToolCallMessagePartComponent = ({ toolName, argsText, result }) => {\n  return (\n    <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">\n      <div className="font-medium">{toolName}</div>\n      {argsText ? <pre className="mt-2 overflow-auto text-xs">{argsText}</pre> : null}\n      {result ? <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(result, null, 2)}</pre> : null}\n    </div>\n  );\n};\n`;
}

function tooltipIconButtonShim() {
  return `"use client";\n\nimport type { ButtonHTMLAttributes, ReactNode } from "react";\nimport { cn } from "@/lib/utils";\n\ntype TooltipIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {\n  tooltip?: string;\n  side?: "top" | "right" | "bottom" | "left";\n  variant?: string;\n  size?: string;\n  children?: ReactNode;\n};\n\nexport function TooltipIconButton({ tooltip, className, children, ...props }: TooltipIconButtonProps) {\n  return (\n    <button\n      type="button"\n      aria-label={tooltip}\n      title={tooltip}\n      className={cn("inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-50", className)}\n      {...props}\n    >\n      {children}\n    </button>\n  );\n}\n`;
}

function docsModelOptionsShim() {
  return `export function docsModelOptions() {\n  return [\n    { id: "gpt-4.1-mini", name: "GPT-4.1 mini" },\n    { id: "gpt-4.1", name: "GPT-4.1" },\n  ];\n}\n`;
}

function faviconSvg() {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#111827"/><path d="M9 10h14v12H9z" fill="#fff" opacity=".9"/><path d="M12 14h8M12 18h5" stroke="#111827" stroke-width="2" stroke-linecap="round"/></svg>\n';
}
