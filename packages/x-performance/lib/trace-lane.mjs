import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, relative, resolve } from "node:path";
import { ensureRefWorktree } from "./ref-worktree.mjs";
import {
  renderTraceMarkdown,
  renderTraceTerminal,
  writeLaneOutputs,
} from "./report.mjs";
import { envStamp, perfDir, pkgRoot, repoRoot } from "./suite.mjs";

const tailwindBin = () => {
  const require = createRequire(join(pkgRoot, "package.json"));
  const pkgPath = require.resolve("@tailwindcss/cli/package.json");
  const bin = require(pkgPath).bin;
  return join(
    dirname(pkgPath),
    typeof bin === "string" ? bin : bin.tailwindcss,
  );
};

// A fixture's stylesheet imports package CSS by a path relative to fixtures/.
// Staging rewrites those imports to absolute paths under one side's
// repository root and compiles the result with the current tree's tailwind,
// so the fixture definition is shared and only the imported package sources
// differ between sides; nothing is written into the ref worktree.
export const stageFixture = (fixture, sideRoot, outDir) => {
  const currentRoot = repoRoot();
  const name = basename(fixture);
  mkdirSync(outDir, { recursive: true });
  const stagedHtml = join(outDir, name);
  copyFileSync(fixture, stagedHtml);
  const entry = fixture.replace(/\.html$/, ".css");
  if (!name.endsWith(".html") || !existsSync(entry)) return stagedHtml;
  const css = readFileSync(entry, "utf8").replace(
    /(@import|@source)\s+(["'])([^"']+)\2/g,
    (whole, directive, quote, spec) => {
      if (!spec.startsWith(".")) return whole;
      const target = resolve(dirname(entry), spec);
      const rewritten =
        directive === "@source"
          ? join(outDir, basename(target))
          : join(sideRoot, relative(currentRoot, target));
      return `${directive} ${quote}${rewritten}${quote}`;
    },
  );
  const source = join(outDir, basename(entry).replace(/\.css$/, ".source.css"));
  writeFileSync(source, css);
  execFileSync(
    process.execPath,
    [tailwindBin(), "-i", source, "-o", join(outDir, basename(entry))],
    { cwd: pkgRoot, stdio: ["ignore", 2, "inherit"] },
  );
  return stagedHtml;
};

const isUrl = (target) => /^https?:/i.test(target);

const slugFor = (fixture) =>
  relative(repoRoot(), fixture).replace(/[\\/]/g, "-");

const hintFor = (target) => {
  const arg = isUrl(target) ? target : resolve(target);
  const url = new URL(arg, "file:///");
  return { arg, hint: basename(url.pathname) || url.hostname || arg };
};

const metrics = (r) => ({
  wallSeconds: r.wallSeconds,
  mainBusyMs: r.mainBusyMs,
  mainBusyPct: r.mainBusyPct,
  compositorBusyMs: r.compositorBusyMs,
  compositorBusyPct: r.compositorBusyPct,
  paintImage: r.counts.PaintImage ?? 0,
  commit: r.counts.Commit ?? 0,
  prePaint: r.counts.PrePaint ?? 0,
  frames: r.counts.PipelineReporter ?? 0,
});

const traceOne = async (tools, target, seconds, screenshotPath) => {
  const { arg, hint } = hintFor(target);
  console.error(`tracing ${hint} for ${seconds}s...`);
  const events = await tools.captureTrace(arg, seconds, 1500, screenshotPath);
  return metrics(tools.analyzeTrace(events, hint, seconds * 1_000_000));
};

const stamp = (env) => `${env.sha}${env.dirty ? ", dirty" : ""}`;

const finish = (doc, outputs) => {
  renderTraceTerminal(doc);
  writeLaneOutputs(doc, outputs, renderTraceMarkdown);
};

export const trace = async (targets, seconds, outputs = {}) => {
  const tools = await import("./trace.mjs");
  mkdirSync(perfDir, { recursive: true });
  const env = envStamp();
  const fixtures = [];
  for (const target of targets) {
    const { hint } = hintFor(target);
    const staged =
      target.endsWith(".html") && !isUrl(target)
        ? stageFixture(
            resolve(target),
            repoRoot(),
            join(perfDir, "trace-pages", "head"),
          )
        : target;
    const screenshot = join(perfDir, `trace-${hint}-head.png`);
    fixtures.push({
      name: hint,
      base: null,
      head: await traceOne(tools, staged, seconds, screenshot),
      screenshots: { head: screenshot },
    });
  }
  finish(
    {
      schema: "aui-perf/trace@1",
      generatedAt: new Date().toISOString(),
      seconds,
      base: null,
      head: { label: `head (${stamp(env)})`, sha: env.sha, dirty: env.dirty },
      fixtures,
    },
    outputs,
  );
};

export const traceRef = async (ref, targets, seconds, outputs = {}) => {
  const tools = await import("./trace.mjs");
  const { wt, sha } = ensureRefWorktree(ref, { build: false });
  mkdirSync(perfDir, { recursive: true });
  const env = envStamp();
  const fixtures = [];
  for (const target of targets) {
    const fixture = resolve(target);
    const name = slugFor(fixture);
    const shots = {
      base: join(perfDir, `trace-${name}-base.png`),
      head: join(perfDir, `trace-${name}-head.png`),
    };
    const base = await traceOne(
      tools,
      stageFixture(fixture, wt, join(perfDir, "trace-pages", "base")),
      seconds,
      shots.base,
    );
    const head = await traceOne(
      tools,
      stageFixture(fixture, repoRoot(), join(perfDir, "trace-pages", "head")),
      seconds,
      shots.head,
    );
    fixtures.push({ name, base, head, screenshots: shots });
  }
  finish(
    {
      schema: "aui-perf/trace@1",
      generatedAt: new Date().toISOString(),
      seconds,
      base: { label: ref === sha ? `base (${sha})` : `${ref} (${sha})`, sha },
      head: { label: `head (${stamp(env)})`, sha: env.sha, dirty: env.dirty },
      fixtures,
    },
    outputs,
  );
  console.error(
    `ref worktree kept at ${wt}; remove with: git worktree remove "${wt}"`,
  );
};
