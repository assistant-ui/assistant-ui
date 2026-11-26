import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  findAgentMarkdownProblems,
  splitLLMsFull,
  summarizeAgentMarkdownProblems,
} from "../lib/agent-markdown-check.ts";

// Runs after `next build` (see the `build` script) over the prerendered
// llms-full.txt, which holds every docs, examples, design and elements page in
// the same markdown the `.md` routes and the MCP `read_page` tool serve. It
// fails when a page element reaches agents as a placeholder or a raw
// component tag instead of its text.
const DOCS_ROOT = process.cwd();
const llmsFullPath = path.join(
  DOCS_ROOT,
  ".next",
  "server",
  "app",
  "llms-full.txt.body",
);

if (!existsSync(llmsFullPath)) {
  console.error(
    `check-agent-markdown: ${path.relative(DOCS_ROOT, llmsFullPath)} is missing; llms-full.txt is no longer prerendered, so point this check at its new output.`,
  );
  process.exit(1);
}

const text = readFileSync(llmsFullPath, "utf-8");
const pages = splitLLMsFull(text);
const problems = pages.flatMap(findAgentMarkdownProblems);
const blocking = problems.filter((problem) => problem.kind !== "empty-section");

console.log(
  `Agent markdown: ${pages.length} pages, ${(Buffer.byteLength(text) / 1e6).toFixed(2)} MB in llms-full.txt`,
);
if (problems.length > 0) console.log(summarizeAgentMarkdownProblems(problems));
if (blocking.length > 0) {
  for (const problem of blocking.slice(0, 50))
    console.error(`  ${problem.url}: ${problem.kind} ${problem.detail}`);
  console.error(
    "Every element a docs page shows must reach its markdown as text: give the component an LLM variant in lib/llm-components.tsx, or a `description` prop if it is a live demo.",
  );
  process.exitCode = 1;
}
