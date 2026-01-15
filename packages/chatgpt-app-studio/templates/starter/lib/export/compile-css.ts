import path from "node:path";
import fs from "node:fs/promises";
import postcss from "postcss";

function buildCssTemplate(sourceDirectives: string[]): string {
  const sources = sourceDirectives.map((s) => `@source "${s}";`).join("\n");

  return `
@import "tailwindcss" source(none);
${sources}

@custom-variant dark (&:is(.dark *, [data-theme="dark"], [data-theme="dark"] *));

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --radius-4xl: calc(var(--radius) + 16px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`.trim();
}

export interface CompileCssOptions {
  projectRoot: string;
  widgetEntryPoint: string;
  outputPath: string;
}

export interface CompileCssResult {
  success: boolean;
  css: string | null;
  errors: string[];
}

async function getSourceGlobs(
  projectRoot: string,
  entryPoint: string,
  tempDir: string,
): Promise<string[]> {
  const entryDir = path.dirname(path.resolve(projectRoot, entryPoint));
  const componentsDir = path.join(projectRoot, "components");
  const libDir = path.join(projectRoot, "lib");

  const globs: string[] = [];

  const relativeEntry = path.relative(tempDir, entryDir).replace(/\\/g, "/");
  globs.push(`${relativeEntry}/**/*.{tsx,ts,jsx,js}`);

  try {
    await fs.access(path.join(componentsDir, "ui"));
    const relativeUi = path
      .relative(tempDir, path.join(componentsDir, "ui"))
      .replace(/\\/g, "/");
    globs.push(`${relativeUi}/**/*.{tsx,ts}`);
  } catch {
    // Directory doesn't exist
  }

  try {
    await fs.access(path.join(componentsDir, "examples"));
    const relativeExamples = path
      .relative(tempDir, path.join(componentsDir, "examples"))
      .replace(/\\/g, "/");
    globs.push(`${relativeExamples}/**/*.{tsx,ts}`);
  } catch {
    // Directory doesn't exist
  }

  try {
    await fs.access(libDir);
    const relativeLib = path.relative(tempDir, libDir).replace(/\\/g, "/");
    globs.push(`${relativeLib}/**/*.{tsx,ts}`);
  } catch {
    // Directory doesn't exist
  }

  return globs;
}

export async function compileCss(
  options: CompileCssOptions,
): Promise<CompileCssResult> {
  const { projectRoot, widgetEntryPoint, outputPath } = options;
  const errors: string[] = [];

  try {
    const tempDir = path.join(projectRoot, ".export-temp");
    await fs.mkdir(tempDir, { recursive: true });

    const sourceGlobs = await getSourceGlobs(
      projectRoot,
      widgetEntryPoint,
      tempDir,
    );
    const cssContent = buildCssTemplate(sourceGlobs);

    const cssEntryPath = path.join(tempDir, "export-entry.css");
    await fs.writeFile(cssEntryPath, cssContent, "utf-8");

    const tailwindPlugin = await import("@tailwindcss/postcss");
    const plugin = tailwindPlugin.default ?? tailwindPlugin;

    const processor = postcss([
      plugin({
        base: tempDir,
      }),
    ]);

    const result = await processor.process(cssContent, {
      from: cssEntryPath,
      to: outputPath,
    });

    for (const warning of result.warnings()) {
      errors.push(`CSS Warning: ${warning.text}`);
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, result.css, "utf-8");

    return {
      success: true,
      css: result.css,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`CSS compilation failed: ${message}`);
    return {
      success: false,
      css: null,
      errors,
    };
  }
}
