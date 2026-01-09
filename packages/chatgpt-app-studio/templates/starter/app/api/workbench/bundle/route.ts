import { NextRequest, NextResponse } from "next/server";
import * as esbuild from "esbuild";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

export const runtime = "nodejs";

function toImportPath(fromDir: string, absoluteTargetPath: string): string {
  const relativePath = path
    .relative(fromDir, absoluteTargetPath)
    .replace(/\\/g, "/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

const ENTRY_TEMPLATE = `
import React from "react";
import { createRoot } from "react-dom/client";
import { ProductionOpenAIProvider } from "@/lib/export/production-provider";
WIDGET_IMPORT_LINE

function App() {
  const props = typeof window !== "undefined" && window.openai?.toolInput
    ? window.openai.toolInput
    : {};

  return React.createElement(
    ProductionOpenAIProvider,
    null,
    React.createElement(Widget, props)
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(React.createElement(App));
}
`.trim();

interface ComponentConfig {
  entryFile: string;
  exportName?: string;
}

const COMPONENT_MAP: Record<string, ComponentConfig> = {
  welcome: {
    entryFile: "lib/workbench/wrappers/welcome-card-sdk.tsx",
    exportName: "WelcomeCardSDK",
  },
  "poi-map": {
    entryFile: "lib/workbench/wrappers/poi-map-sdk.tsx",
    exportName: "POIMapSDK",
  },
};

const bundleCache = new Map<string, { bundle: string; timestamp: number }>();
const CACHE_TTL = 5000;

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      {
        error:
          "This endpoint is only available in development. Run the workbench locally with `npm run dev`.",
      },
      { status: 403 },
    );
  }

  const componentId = request.nextUrl.searchParams.get("id");

  if (!componentId) {
    return NextResponse.json(
      { error: "Missing component id parameter" },
      { status: 400 },
    );
  }

  const config = COMPONENT_MAP[componentId];
  if (!config) {
    return NextResponse.json(
      { error: `Unknown component: ${componentId}` },
      { status: 404 },
    );
  }

  const cacheKey = componentId;
  const cached = bundleCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(cached.bundle, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache",
      },
    });
  }

  try {
    const projectRoot = process.cwd();
    const tempDir = path.join(projectRoot, ".workbench-temp");
    await fs.mkdir(tempDir, { recursive: true });

    const widgetPath = path.resolve(projectRoot, config.entryFile);
    // Use relative imports to avoid Windows "C:/..." path issues in ESM specifiers.
    const widgetImportPath = toImportPath(tempDir, widgetPath);

    const importLine = config.exportName
      ? `import { ${config.exportName} as Widget } from "${widgetImportPath}";`
      : `import Widget from "${widgetImportPath}";`;

    const entryContent = ENTRY_TEMPLATE.replace(
      "WIDGET_IMPORT_LINE",
      importLine,
    );
    const entryPath = path.join(tempDir, `entry-${crypto.randomUUID()}.tsx`);
    await fs.writeFile(entryPath, entryContent, "utf-8");

    const result = await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      minify: false,
      format: "esm",
      target: ["es2020"],
      write: false,
      loader: {
        ".tsx": "tsx",
        ".ts": "ts",
        ".jsx": "jsx",
        ".js": "js",
        ".css": "css",
        ".png": "dataurl",
        ".jpg": "dataurl",
        ".svg": "dataurl",
        ".gif": "dataurl",
      },
      alias: {
        "@": projectRoot,
      },
      external: [],
      define: {
        "process.env.NODE_ENV": '"development"',
      },
      jsx: "automatic",
      jsxImportSource: "react",
    });

    if (result.errors.length > 0) {
      const errorMessages = result.errors
        .map((e) => `${e.location?.file ?? ""}:${e.text}`)
        .join("\n");
      return NextResponse.json(
        { error: `Bundle failed: ${errorMessages}` },
        { status: 500 },
      );
    }

    const bundle = result.outputFiles?.[0]?.text ?? "";

    bundleCache.set(cacheKey, { bundle, timestamp: Date.now() });

    try {
      await fs.unlink(entryPath);
    } catch {
      // Ignore cleanup errors
    }

    return new NextResponse(bundle, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Bundle failed: ${message}` },
      { status: 500 },
    );
  }
}
