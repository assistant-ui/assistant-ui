#!/usr/bin/env node
// Extracts the human docs (apps/docs/content/docs) into plain Markdown files
// plus an INDEX.md in sidebar order, which is all the exam's reader may see.
//
// Usage: node extract.mjs <out-dir> [content-dir]
// content-dir defaults to this checkout's apps/docs/content/docs; pass another
// one (say, main's, from `git archive`) to grade a before and an after.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(
  process.argv[3] ?? path.join(here, "../../content/docs"),
);
const outDir = path.resolve(process.argv[2] ?? path.join(here, ".docs-text"));

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

function parseFrontmatter(src) {
  const match = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, body: src };
  const data = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    data[kv[1]] = value;
  }
  return { data, body: src.slice(match[0].length) };
}

// Turns one MDX page into text a reader can follow: drops imports, exports
// and MDX comments, and swaps each Flow diagram for the text version it ships
// for assistive tech (its `llm` prop). Everything else stays as written.
export function mdxToText(src) {
  const { data, body } = parseFrontmatter(src);
  let text = body.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  text = text.replace(
    /<Flow\.Root\s+llm=\{`([\s\S]*?)`\}\s*>[\s\S]*?<\/Flow\.Root>/g,
    (_, graph) => `\`\`\`mermaid\n${graph.trim()}\n\`\`\``,
  );
  // Only real ESM statements, so a prose line that starts with "import the
  // file" or "export your thread" stays.
  const MDX_STATEMENT =
    /^(import\s+(type\s+)?(\{|\*|[A-Za-z_$][\w$]*\s*(,|from\b))|import\s+["']|export\s+((const|let|var|function|async|default|type|interface|class|enum)\b|\{|\*))/;
  const lines = [];
  let inFence = false;
  let skipping = false;
  for (const line of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && !skipping && MDX_STATEMENT.test(line)) {
      skipping = !/;\s*$|from\s+["'][^"']+["'];?\s*$/.test(line);
      continue;
    }
    if (skipping) {
      if (/;\s*$|from\s+["'][^"']+["'];?\s*$|^\}/.test(line)) skipping = false;
      continue;
    }
    lines.push(line);
  }
  const head = [`# ${data.title ?? "Untitled"}`];
  if (data.description) head.push("", `> ${data.description}`);
  return {
    title: data.title ?? "Untitled",
    description: data.description ?? "",
    text: `${head.join("\n")}\n\n${lines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()}\n`,
  };
}

const urlSegment = (name) => (/^\(.*\)$/.test(name) ? null : name);

function pageFile(dir, name) {
  for (const candidate of [
    `${name}.mdx`,
    `${name}.md`,
    path.join(name, "index.mdx"),
  ]) {
    const file = path.join(dir, candidate);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

const seen = new Set();
const indexLines = [];

function emitPage(file, urlParts, depth) {
  if (seen.has(file)) return;
  seen.add(file);
  const { title, description, text } = mdxToText(fs.readFileSync(file, "utf8"));
  const url = `/docs/${urlParts.filter(Boolean).join("/")}`.replace(
    /\/index$/,
    "",
  );
  const rel = `${url.slice(1) || "docs/index"}.md`;
  const outFile = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `<!-- ${url} -->\n${text}`);
  const desc = description ? ` — ${description}` : "";
  indexLines.push(`${"  ".repeat(depth)}- [${title}](${rel})${desc}`);
}

function listEntries(dir) {
  return fs
    .readdirSync(dir)
    .filter((n) => !n.startsWith("."))
    .map((n) => n.replace(/\.mdx?$/, ""))
    .filter((n) => n !== "meta.json" && n !== "meta")
    .sort();
}

function walk(dir, urlParts, depth) {
  const metaFile = path.join(dir, "meta.json");
  const meta = fs.existsSync(metaFile) ? readJson(metaFile) : {};
  let entries = meta.pages ?? listEntries(dir);
  const named = new Set(
    entries.filter(
      (e) => !e.startsWith("...") && !e.startsWith("[") && !e.startsWith("---"),
    ),
  );
  entries = entries.flatMap((e) =>
    e === "..." ? listEntries(dir).filter((n) => !named.has(n)) : [e],
  );

  for (const entry of entries) {
    if (entry.startsWith("---")) {
      indexLines.push(
        `${"  ".repeat(depth)}- **${entry.replace(/-/g, "").trim()}**`,
      );
      continue;
    }
    const link = entry.match(/^\[(.+)\]\((.+)\)$/);
    if (link) {
      indexLines.push(`${"  ".repeat(depth)}- ${link[1]}: see ${link[2]}`);
      continue;
    }
    const inline = entry.startsWith("...");
    const name = inline ? entry.slice(3) : entry;
    const sub = path.join(dir, name);
    if (fs.existsSync(sub) && fs.statSync(sub).isDirectory()) {
      const subMeta = path.join(sub, "meta.json");
      const title = fs.existsSync(subMeta) ? readJson(subMeta).title : null;
      const nextDepth = inline || !title ? depth : depth + 1;
      const where = urlSegment(name)
        ? ` (/docs/${[...urlParts, name].filter(Boolean).join("/")})`
        : "";
      if (title && !inline)
        indexLines.push(`${"  ".repeat(depth)}- **${title}**${where}`);
      walk(sub, [...urlParts, urlSegment(name)], nextDepth);
      continue;
    }
    const file = pageFile(dir, name);
    if (file)
      emitPage(file, [...urlParts, name === "index" ? "index" : name], depth);
  }
}

function allPages(dir, urlParts, out = []) {
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory())
      allPages(full, [...urlParts, urlSegment(name)], out);
    else if (/\.mdx?$/.test(name))
      out.push([full, [...urlParts, name.replace(/\.mdx?$/, "")]]);
  }
  return out;
}

// The output folder is replaced, so only an empty folder or one an earlier
// extraction marked as its own qualifies, and never a folder holding this exam.
export const MARKER = ".concept-exam-extract";

export function safeToReplace(dir) {
  if (!path.relative(dir, here).startsWith("..")) return false;
  if (!fs.existsSync(dir)) return true;
  return (
    fs.readdirSync(dir).length === 0 || fs.existsSync(path.join(dir, MARKER))
  );
}

function main() {
  if (!safeToReplace(outDir)) {
    console.error(
      `Refusing to replace ${outDir}: pass an empty folder or one an earlier extraction wrote.`,
    );
    process.exitCode = 1;
    return;
  }
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, MARKER), "written by extract.mjs\n");
  walk(docsRoot, [], 0);
  const orphans = allPages(docsRoot, []).filter(([file]) => !seen.has(file));
  if (orphans.length) {
    indexLines.push("- **Pages not in the sidebar**");
    for (const [file, parts] of orphans) emitPage(file, parts, 1);
  }
  fs.writeFileSync(
    path.join(outDir, "INDEX.md"),
    `# assistant-ui documentation\n\nEvery page of the docs site in sidebar order, with its description. Paths are relative to this file.\n\n${indexLines.join("\n")}\n`,
  );
  console.log(`${seen.size} pages -> ${outDir}`);
}

const invoked = process.argv[1] && fs.realpathSync(process.argv[1]);
if (invoked === fileURLToPath(import.meta.url)) main();
