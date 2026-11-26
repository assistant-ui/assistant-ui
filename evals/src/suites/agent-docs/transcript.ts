import { existsSync, readFileSync } from "node:fs";

export interface TranscriptSummary {
  turns: number;
  costUsd: number | null;
  /** Docs files the agent opened, relative to the docs folder, in order of first read. */
  docsRead: string[];
  /** Searches the agent ran over the docs. */
  docsSearches: string[];
  /** Reads, searches and shell commands that went into node_modules: the docs didn't answer something. */
  nodeModulesLookups: number;
  /** Shell commands that reached for the network beyond package installs. */
  webFetches: string[];
  /** The agent's closing message: what it built and what the docs lacked. */
  finalMessage: string;
}

/** Summarizes a `claude -p --output-format stream-json` transcript. */
export function summarizeTranscript(
  file: string,
  docsDir: string,
): TranscriptSummary {
  const summary: TranscriptSummary = {
    turns: 0,
    costUsd: null,
    docsRead: [],
    docsSearches: [],
    nodeModulesLookups: 0,
    webFetches: [],
    finalMessage: "",
  };
  if (!existsSync(file)) return summary;
  const rel = (path: string) =>
    path.startsWith(docsDir) ? path.slice(docsDir.length) || "/" : undefined;
  let lastText = "";
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let event: any;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === "result") {
      summary.turns = event.num_turns ?? summary.turns;
      summary.costUsd = event.total_cost_usd ?? null;
      if (typeof event.result === "string") summary.finalMessage = event.result;
      continue;
    }
    if (event.type !== "assistant") continue;
    for (const block of event.message?.content ?? []) {
      if (block.type === "text" && block.text) lastText = block.text;
      if (block.type !== "tool_use") continue;
      const input = block.input ?? {};
      const target = String(
        input.file_path ?? input.path ?? input.command ?? input.pattern ?? "",
      );
      if (target.includes("node_modules")) summary.nodeModulesLookups++;
      if (block.name === "Read") {
        const doc = rel(String(input.file_path ?? ""));
        if (doc && !summary.docsRead.includes(doc)) summary.docsRead.push(doc);
      } else if (block.name === "WebFetch") {
        const url = String(input.url ?? "");
        const page = url.replace(/^https?:\/\/[^/]+/, "");
        if (page && !summary.docsRead.includes(page))
          summary.docsRead.push(page);
      } else if (block.name === "Grep" || block.name === "Glob") {
        if (String(input.path ?? "").startsWith(docsDir)) {
          summary.docsSearches.push(String(input.pattern ?? ""));
        }
      } else if (block.name === "Bash") {
        const command = String(input.command ?? "");
        if (command.includes(docsDir)) {
          for (const [, path] of command.matchAll(
            /(?:cat|head|tail|sed -n [^ ]+|less)\s+"?([^\s"|;]+\.(?:md|txt))/g,
          )) {
            const doc = rel(path!);
            if (doc && !summary.docsRead.includes(doc))
              summary.docsRead.push(doc);
          }
          if (/\b(grep|rg|find)\b/.test(command)) {
            summary.docsSearches.push(command.slice(0, 200));
          }
        }
        if (
          /\b(curl|wget)\b/.test(command) &&
          !/127\.0\.0\.1|localhost/.test(command)
        ) {
          summary.webFetches.push(command.slice(0, 200));
        }
      }
    }
  }
  if (!summary.finalMessage) summary.finalMessage = lastText;
  return summary;
}
