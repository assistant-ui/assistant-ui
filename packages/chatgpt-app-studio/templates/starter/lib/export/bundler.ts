import * as esbuild from "esbuild";
import path from "node:path";
import fs from "node:fs/promises";
import type { ExportConfig, ExportedFile } from "./types";
import { compileCss } from "./compile-css";

const ENTRY_TEMPLATE = `
import React from "react";
import { createRoot } from "react-dom/client";
import { ProductionOpenAIProvider } from "@/lib/export/production-provider";
WIDGET_IMPORT_LINE

function App() {
  const props = typeof window !== "undefined" && (window as any).openai?.toolInput
    ? (window as any).openai.toolInput
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

function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}

function buildWidgetImportLine(
  widgetImportPath: string,
  exportName?: string,
): { importLine: string; error?: string } {
  const trimmed = exportName?.trim();

  if (!trimmed || trimmed === "default") {
    return { importLine: `import Widget from "${widgetImportPath}";` };
  }

  if (!isValidIdentifier(trimmed)) {
    return {
      importLine: "",
      error: `Invalid widget export name: "${trimmed}". Use a valid identifier or "default".`,
    };
  }

  return {
    importLine: `import { ${trimmed} as Widget } from "${widgetImportPath}";`,
  };
}

export interface BundleResult {
  success: boolean;
  jsFile: ExportedFile | null;
  cssFile: ExportedFile | null;
  errors: string[];
}

export async function bundleWidget(
  config: ExportConfig,
  projectRoot: string,
): Promise<BundleResult> {
  const errors: string[] = [];
  const tempDir = path.join(projectRoot, ".export-temp");
  const outDir = path.resolve(projectRoot, config.output.dir, "widget");

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(outDir, { recursive: true });

    const widgetPath = path.resolve(projectRoot, config.widget.entryPoint);

    try {
      await fs.access(widgetPath);
    } catch {
      errors.push(`Widget entry point not found: ${widgetPath}`);
      return { success: false, jsFile: null, cssFile: null, errors };
    }

    // Use relative path from temp entry to widget file to avoid Windows absolute path issues
    // (C:/... looks like a URL scheme to bundlers)
    const relativeWidgetPath = path
      .relative(tempDir, widgetPath)
      .replace(/\\/g, "/");
    const widgetImportPath = relativeWidgetPath.startsWith(".")
      ? relativeWidgetPath
      : `./${relativeWidgetPath}`;
    const { importLine, error } = buildWidgetImportLine(
      widgetImportPath,
      config.widget.exportName,
    );
    if (error) {
      errors.push(error);
      return { success: false, jsFile: null, cssFile: null, errors };
    }

    const entryContent = ENTRY_TEMPLATE.replace(
      "WIDGET_IMPORT_LINE",
      importLine,
    );
    const entryPath = path.join(tempDir, "entry.tsx");
    await fs.writeFile(entryPath, entryContent, "utf-8");

    const result = await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      minify: true,
      format: "esm",
      target: ["es2020"],
      outdir: outDir,
      entryNames: "widget",
      assetNames: "assets/[name]",
      splitting: false,
      sourcemap: false,
      metafile: true,
      loader: {
        ".tsx": "tsx",
        ".ts": "ts",
        ".jsx": "jsx",
        ".js": "js",
        ".css": "css",
        ".png": "file",
        ".jpg": "file",
        ".svg": "file",
        ".gif": "file",
      },
      alias: {
        "@": projectRoot,
      },
      external: [],
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      jsx: "automatic",
      jsxImportSource: "react",
    });

    if (result.errors.length > 0) {
      errors.push(
        ...result.errors.map((e) => `${e.location?.file ?? ""}:${e.text}`),
      );
      return { success: false, jsFile: null, cssFile: null, errors };
    }

    const jsPath = path.join(outDir, "widget.js");
    const cssPath = path.join(outDir, "widget.css");

    let jsFile: ExportedFile | null = null;
    let cssFile: ExportedFile | null = null;

    try {
      const jsStat = await fs.stat(jsPath);
      jsFile = {
        path: jsPath,
        relativePath: "widget/widget.js",
        size: jsStat.size,
      };
    } catch {
      errors.push("Failed to find bundled JS file");
    }

    console.log("🎨 Compiling Tailwind CSS...");
    const cssResult = await compileCss({
      projectRoot,
      widgetEntryPoint: config.widget.entryPoint,
      outputPath: cssPath,
    });

    if (!cssResult.success) {
      errors.push(...cssResult.errors);
    } else {
      try {
        const cssStat = await fs.stat(cssPath);
        cssFile = {
          path: cssPath,
          relativePath: "widget/widget.css",
          size: cssStat.size,
        };
      } catch {
        errors.push("Failed to find compiled CSS file");
      }
    }

    return {
      success: errors.length === 0 && jsFile !== null,
      jsFile,
      cssFile,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Bundle failed: ${message}`);
    return { success: false, jsFile: null, cssFile: null, errors };
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}
