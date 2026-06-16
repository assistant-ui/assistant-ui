import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { type ViteDevServer, createServer } from "vite";
import { chromium } from "playwright";
import {
  DIAGRAM_DIR,
  extractMermaidBlocks,
  hashMermaid,
  renderMarker,
} from "./shared.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const harnessRoot = here;
const projectRoot = path.resolve(here, "..", "..");
const contentDir = path.join(projectRoot, "content");
const outDir = path.join(projectRoot, "public", DIAGRAM_DIR);

// Visual export options. SVG keeps diagrams crisp and small; padding gives the
// shapes a little breathing room inside the prose column.
const RENDER_OPTS = { padding: 16 };

interface Diagram {
  hash: string;
  source: string;
  doc: string;
}

async function walkMarkdown(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walkMarkdown(full);
      return entry.isFile() && /\.mdx?$/.test(entry.name) ? [full] : [];
    }),
  );
  return files.flat();
}

async function collectDiagrams(): Promise<Diagram[]> {
  const files = await walkMarkdown(contentDir);
  const diagrams: Diagram[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const markdown = await fs.readFile(file, "utf8");
    for (const source of extractMermaidBlocks(markdown)) {
      const hash = hashMermaid(source);
      if (seen.has(hash)) continue;
      seen.add(hash);
      diagrams.push({ hash, source, doc: path.relative(projectRoot, file) });
    }
  }
  return diagrams;
}

/** Path to the light/dark SVG variants for a diagram hash. */
function variantPaths(hash: string): { light: string; dark: string } {
  return {
    light: path.join(outDir, `${hash}.svg`),
    dark: path.join(outDir, `${hash}.dark.svg`),
  };
}

async function hasMarker(file: string): Promise<boolean> {
  try {
    return (await fs.readFile(file, "utf8")).includes(renderMarker());
  } catch {
    return false;
  }
}

/**
 * A diagram is up to date when both theme variants exist and carry the current
 * render marker. Source edits change the filename (so a missing file triggers a
 * render); render-logic changes bump the marker (so a stale marker does).
 */
async function isUpToDate(hash: string): Promise<boolean> {
  const { light, dark } = variantPaths(hash);
  return (await hasMarker(light)) && (await hasMarker(dark));
}

/**
 * Remove rendered SVGs that no diagram references anymore. NOT run as part of a
 * normal render: a stale content render cache can still reference an old
 * filename, and deleting that file would 404. Run explicitly
 * (`pnpm generate:mermaid -- --clean`) when you want to GC.
 */
async function pruneOrphans(keep: Set<string>): Promise<void> {
  let files: string[];
  try {
    files = await fs.readdir(outDir);
  } catch {
    return;
  }
  for (const name of files) {
    if (!name.endsWith(".svg")) continue;
    const hash = name.replace(/\.dark\.svg$/, "").replace(/\.svg$/, "");
    if (!keep.has(hash)) {
      await fs.rm(path.join(outDir, name));
      console.log(`[mermaid] pruned orphan ${name}`);
    }
  }
}

async function renderPending(pending: Diagram[]): Promise<void> {
  let server: ViteDevServer | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    server = await createServer({
      root: harnessRoot,
      configFile: false,
      // tldraw.css is plain CSS — pin an empty inline PostCSS config so Vite
      // doesn't walk up and load the docs' Tailwind postcss.config.mjs.
      css: { postcss: { plugins: [] } },
      logLevel: "warn",
      server: { host: "127.0.0.1" },
      optimizeDeps: {
        include: ["react", "react-dom/client", "tldraw", "@tldraw/mermaid"],
      },
    });
    await server.listen();
    const base = server.resolvedUrls?.local[0];
    if (!base) throw new Error("vite did not report a local url");

    browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1200 },
    });
    page.on("pageerror", (err) =>
      console.error("[harness pageerror]", err.message),
    );
    page.on("console", (msg) => {
      if (msg.type() === "error")
        console.error("[harness console]", msg.text());
    });

    await page.goto(new URL("harness.html", base).href);
    await page.waitForFunction(
      () =>
        Boolean(
          (window as unknown as { __tldrawEditor?: unknown }).__tldrawEditor,
        ),
      { timeout: 30_000 },
    );

    const failures: string[] = [];
    for (const diagram of pending) {
      try {
        const result = await page.evaluate(
          ({ source, opts }) =>
            (
              window as unknown as {
                renderMermaid: (
                  s: string,
                  o: typeof opts,
                ) => Promise<{ light: string; dark: string }>;
              }
            ).renderMermaid(source, opts),
          { source: diagram.source, opts: RENDER_OPTS },
        );
        const { light, dark } = variantPaths(diagram.hash);
        await fs.writeFile(light, `${renderMarker()}\n${result.light}`, "utf8");
        await fs.writeFile(dark, `${renderMarker()}\n${result.dark}`, "utf8");
        console.log(
          `[mermaid] rendered ${diagram.hash}.svg (+dark)  (${diagram.doc})`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failures.push(`${diagram.doc} (${diagram.hash}): ${message}`);
        console.error(
          `[mermaid] FAILED ${diagram.hash}  (${diagram.doc}): ${message}`,
        );
      }
    }
    if (failures.length) {
      // Renderable diagrams are already written; only the failed ones stay
      // pending, so a re-run after a fix retries just those.
      throw new Error(
        `${failures.length} diagram(s) failed to render:\n  ${failures.join("\n  ")}`,
      );
    }
  } finally {
    await browser?.close();
    await server?.close();
  }
}

export interface RenderSummary {
  total: number;
  rendered: number;
}

/**
 * Ensure every mermaid diagram in the content has an up-to-date SVG. Returns how
 * many were (re)rendered. Launches the headless browser only when something is
 * actually pending, so a fully-cached run never touches Vite or Playwright.
 */
export async function renderDiagrams(): Promise<RenderSummary> {
  const diagrams = await collectDiagrams();
  if (!diagrams.length) return { total: 0, rendered: 0 };

  await fs.mkdir(outDir, { recursive: true });

  const pending: Diagram[] = [];
  for (const diagram of diagrams) {
    if (await isUpToDate(diagram.hash)) continue;
    pending.push(diagram);
  }

  if (pending.length) {
    console.log(
      `[mermaid] rendering ${pending.length} of ${diagrams.length} diagram(s)...`,
    );
    await renderPending(pending);
  }

  return { total: diagrams.length, rendered: pending.length };
}

async function main(): Promise<void> {
  if (process.argv.includes("--clean")) {
    const diagrams = await collectDiagrams();
    await pruneOrphans(new Set(diagrams.map((d) => d.hash)));
  }

  const { total, rendered } = await renderDiagrams();
  if (!total) console.log("[mermaid] no mermaid diagrams found");
  else if (!rendered)
    console.log(
      `[mermaid] ${total} diagram(s) already cached, nothing to render`,
    );
  else console.log("[mermaid] done");
}

// Run as a CLI only when invoked directly (not when imported).
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main().catch((err: unknown) => {
    console.error("[mermaid] render failed:", err);
    // The committed SVGs are the source of truth for a deploy build. Never fail
    // the build because a headless browser isn't available to (re)render — the
    // local dev/build flow renders and commits them. Run locally to refresh.
    if (process.env.VERCEL) {
      console.warn("[mermaid] continuing with committed diagrams");
      return;
    }
    process.exit(1);
  });
}
