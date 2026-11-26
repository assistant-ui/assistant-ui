import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

// Every Markdown page that can hold a Python block: the docs site and the
// READMEs the Python packages publish to PyPI.
const PAGES = [
  ...readdirSync(path.join(ROOT, "apps/docs/content"), { recursive: true })
    .map((file) => `apps/docs/content/${file}`)
    .filter((file) => /\.mdx?$/.test(file)),
  ...readdirSync(path.join(ROOT, "python"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((dir) =>
      readdirSync(path.join(ROOT, "python", dir.name))
        .filter((file) => /^README.*\.md$/.test(file))
        .map((file) => `python/${dir.name}/${file}`),
    ),
].filter((file) =>
  /^\s*(`{3,}|~{3,})(python|py|python3)(\s|$)/m.test(
    readFileSync(path.join(ROOT, file), "utf8"),
  ),
);

// Names a block leaves to the reader on purpose: their own app, auth or
// settings, or the inside of a function an earlier block defines. Each entry
// names the block by a piece of its code. Every other name a block uses must
// come from Python, from the block itself or from a block above it on the
// same page.
const READER_SUPPLIED: Record<string, { block: string; names: string[] }[]> = {
  "apps/docs/content/docs/runtimes/ag-ui/durable-threads.mdx": [
    // the app's own session check and agent deps type
    {
      block: "async def current_user(request)",
      names: ["verify_session", "Deps"],
    },
    // the reader's MCP server
    { block: "MCPToolset(MCP_URL)", names: ["MCP_URL"] },
    // built in the production lifespan above the block
    { block: "keepalive_interval=15", names: ["streams"] },
  ],
  "apps/docs/content/docs/runtimes/custom/assistant-transport.mdx": [
    { block: "your_agent.stream()", names: ["your_agent"] },
    // the reader's compiled LangGraph graph
    { block: "graph.astream(", names: ["graph"] },
    // loops inside chat_endpoint and run_callback from "Handling commands"
    { block: "command.parentId is None", names: ["request", "controller"] },
    { block: '"my-custom-command"', names: ["request", "controller"] },
  ],
  "python/assistant-stream/README.md": [
    // the app's own auth: request -> user id
    { block: "owner=current_user", names: ["current_user"] },
  ],
  "python/assistant-stream/README_LANGGRAPH.md": [
    // calls made inside a run callback over graph.astream(..., subgraphs=True)
    { block: '"messages", chunk)', names: ["controller", "namespace"] },
    { block: '"updates", updates)', names: ["controller", "namespace"] },
    { block: "graph.astream(", names: ["graph", "input_messages"] },
  ],
  // The README walks through the package's own main.py.
  "python/assistant-transport-backend-langgraph/README.md": [
    {
      block: "def create_graph(",
      names: [
        "GraphState",
        "agent_node",
        "tool_executor_node",
        "should_call_tools",
        "should_continue_after_tools",
      ],
    },
  ],
  "python/assistant-ui-sync-server-api/README.md": [
    // the app's own token source
    { block: "await fetch_token()", names: ["fetch_token"] },
  ],
};

const allowedIn = (block: Block) =>
  (READER_SUPPLIED[block.file] ?? [])
    .filter((entry) => block.source.includes(entry.block))
    .flatMap((entry) => entry.names);

type Block = {
  file: string;
  line: number;
  source: string;
  syntax?: string;
  undefined?: string[];
  imports?: string[];
  keywords?: string[];
};

const hasPython = (() => {
  try {
    execFileSync("python3", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasPython && !process.env.CI)(
  "Python blocks in the docs",
  () => {
    const blocks = hasPython
      ? execFileSync(
          "python3",
          ["-I", path.join(__dirname, "python-blocks.py"), ...PAGES],
          { cwd: ROOT, encoding: "utf8" },
        )
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line) as Block)
      : [];

    it("finds the blocks", () => {
      expect(blocks.length).toBeGreaterThan(30);
    });

    it("compile", () => {
      expect(
        blocks
          .filter((block) => block.syntax)
          .map((block) => `${block.file}:${block.line} ${block.syntax}`),
      ).toEqual([]);
    });

    it("use only names Python or the page defines", () => {
      expect(
        blocks.flatMap((block) => {
          const allowed = allowedIn(block);
          const missing = (block.undefined ?? []).filter(
            (name) => !allowed.includes(name),
          );
          return missing.length
            ? [`${block.file}:${block.line} ${missing.join(", ")}`]
            : [];
        }),
      ).toEqual([]);
    });

    it("import only what the repo's Python packages define", () => {
      expect(
        blocks.flatMap((block) =>
          (block.imports ?? []).map(
            (name) => `${block.file}:${block.line} ${name}`,
          ),
        ),
      ).toEqual([]);
    });

    it("pass only keyword arguments the packages accept", () => {
      expect(
        blocks.flatMap((block) =>
          (block.keywords ?? []).map(
            (call) => `${block.file}:${block.line} ${call}`,
          ),
        ),
      ).toEqual([]);
    });

    it("leave no stale reader-supplied names", () => {
      expect(
        Object.entries(READER_SUPPLIED).flatMap(([file, entries]) =>
          entries.flatMap((entry) => {
            const matching = blocks.filter(
              (block) =>
                block.file === file && block.source.includes(entry.block),
            );
            if (matching.length === 0)
              return [`${file}: no block has ${entry.block}`];
            return entry.names
              .filter(
                (name) =>
                  !matching.some((block) => block.undefined?.includes(name)),
              )
              .map((name) => `${file}: ${entry.block} uses no ${name}`);
          }),
        ),
      ).toEqual([]);
    });
  },
);
