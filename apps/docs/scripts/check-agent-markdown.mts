import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  findAgentMarkdownProblems,
  isLLMsFullBody,
  splitLLMsFull,
  summarizeAgentMarkdownProblems,
} from "../lib/agent-markdown-check.ts";

// Runs after `next build` (see the `build` script) over the prerendered
// llms-full.txt, which holds every docs, examples, design and elements page in
// the same markdown the `.md` routes and the MCP `read_page` tool serve. It
// fails when a page element reaches agents as a placeholder or a raw
// component tag instead of its text.
const SERVER_DIR = path.join(process.cwd(), ".next", "server");

function findLLMsFullBodies(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findLLMsFullBodies(full, found);
    else if (isLLMsFullBody(path.relative(SERVER_DIR, full))) found.push(full);
  }
  return found;
}

const bodies = findLLMsFullBodies(SERVER_DIR);
if (bodies.length === 0) {
  console.error(
    "check-agent-markdown: no prerendered llms-full.txt under .next/server (app/ or route-cache/APP_ROUTE/); point this check at its new output.",
  );
  process.exit(1);
}

let failed = false;
for (const body of bodies) {
  const text = readFileSync(body, "utf-8");
  const pages = splitLLMsFull(text);
  const where = path.relative(process.cwd(), body);
  if (pages.length === 0) {
    console.error(`check-agent-markdown: ${where} holds no pages.`);
    failed = true;
    continue;
  }
  const problems = pages.flatMap(findAgentMarkdownProblems);
  const blocking = problems.filter(
    (problem) => problem.kind !== "empty-section",
  );

  console.log(
    `Agent markdown: ${pages.length} pages, ${(Buffer.byteLength(text) / 1e6).toFixed(2)} MB in ${where}`,
  );
  if (problems.length > 0)
    console.log(summarizeAgentMarkdownProblems(problems));
  if (blocking.length > 0) {
    for (const problem of blocking.slice(0, 50))
      console.error(`  ${problem.url}: ${problem.kind} ${problem.detail}`);
    failed = true;
  }
}

if (failed) {
  console.error(
    "Every element a docs page shows must reach its markdown as text: see the agent markdown rule in apps/docs/AGENTS.md.",
  );
  process.exitCode = 1;
}
