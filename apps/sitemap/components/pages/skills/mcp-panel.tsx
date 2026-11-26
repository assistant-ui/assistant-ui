"use client";

import {
  ArrowUpRightIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  CornerDownLeftIcon,
  SearchIcon,
} from "lucide-react";
import {
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { ClaudeIcon } from "@/components/icons/claude";
import { AgentIcon } from "@/components/library/agent-icons";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from "@/components/library/ui/menu";
import { DeferredHighlight } from "@/components/shared/deferred-highlight";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

const SERVER_URL = "https://www.assistant-ui.com/mcp";

/** The site's MCP route; `/mcp` rewrites to it. */
const MCP_ENDPOINT = "/api/mcp";

type Client = {
  id: string;
  label: string;
  icon: ReactNode;
  language: "bash" | "json";
  /** Where the snippet goes, or that it runs in a terminal. */
  file: string;
  code: string;
  note: string;
  /** Opens the client's own install prompt. */
  deeplink?: { href: string; label: string };
};

/** An agent's mark from the library's Skills agents, drawn at 16px. */
const agentMark = (slug: string) => (
  <AgentIcon id={`skills/${slug}`} fallback={null} />
);

/** From the MCP section of /docs/llm. */
const CLIENTS: readonly Client[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    icon: agentMark("claude-code"),
    language: "bash",
    file: "Terminal",
    code: `claude mcp add --transport http assistant-ui ${SERVER_URL}`,
    note: "The server is available immediately once added.",
  },
  {
    id: "cursor",
    label: "Cursor",
    icon: agentMark("cursor"),
    language: "json",
    file: ".cursor/mcp.json",
    code: `{
  "mcpServers": {
    "assistant-ui": {
      "url": "${SERVER_URL}"
    }
  }
}`,
    note: "Then open Cursor Settings, MCP, and enable assistant-ui.",
    deeplink: {
      href: "cursor://anysphere.cursor-deeplink/mcp/install?name=assistant-ui&config=eyJ1cmwiOiJodHRwczovL3d3dy5hc3Npc3RhbnQtdWkuY29tL21jcCJ9",
      label: "Add to Cursor",
    },
  },
  {
    id: "vscode",
    label: "GitHub Copilot",
    icon: agentMark("github-copilot"),
    language: "json",
    file: ".vscode/mcp.json",
    code: `{
  "servers": {
    "assistant-ui": {
      "type": "http",
      "url": "${SERVER_URL}"
    }
  }
}`,
    note: "In VS Code, enable Chat > MCP in Settings and use Copilot Chat in Agent mode.",
  },
  {
    id: "windsurf",
    label: "Windsurf",
    icon: agentMark("windsurf"),
    language: "json",
    file: "~/.codeium/windsurf/mcp_config.json",
    code: `{
  "mcpServers": {
    "assistant-ui": {
      "serverUrl": "${SERVER_URL}"
    }
  }
}`,
    note: "Fully quit and reopen Windsurf after adding it.",
  },
  {
    id: "zed",
    label: "Zed",
    icon: agentMark("zed"),
    language: "json",
    file: "~/.config/zed/settings.json",
    code: `{
  "context_servers": {
    "assistant-ui": {
      "command": {
        "path": "npx",
        "args": ["-y", "@assistant-ui/mcp-docs-server"]
      }
    }
  }
}`,
    note: "Zed runs MCP servers as local commands, so this uses the stdio package.",
  },
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    icon: <ClaudeIcon className="text-[#D97757]" />,
    language: "json",
    file: "claude_desktop_config.json",
    code: `{
  "mcpServers": {
    "assistant-ui": {
      "command": "npx",
      "args": ["-y", "@assistant-ui/mcp-docs-server"]
    }
  }
}`,
    note: "Restart Claude Desktop after updating the configuration.",
  },
];

const QUERIES = ["streaming", "tool UI", "thread list", "attachments"];

/** The home demo's lift; the docs zero the shadow tokens, so it is inline. */
const LIFT_SHADOW: CSSProperties = {
  boxShadow: "0 1px 2px rgb(0 0 0 / 0.05), 0 24px 48px -20px rgb(0 0 0 / 0.28)",
};

type Result = { title: string; url: string; description?: string };

type Search =
  | { state: "idle" }
  | { state: "loading"; query: string }
  | { state: "done"; query: string; results: Result[] }
  | { state: "error"; query: string };

/** Calls the search_docs tool over MCP's Streamable HTTP transport. */
async function searchDocs(query: string): Promise<Result[]> {
  const response = await fetch(MCP_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "search_docs", arguments: { query } },
    }),
  });
  if (!response.ok) throw new Error(String(response.status));
  const body = (await response.json()) as {
    result?: { content?: { type: string; text?: string }[] };
  };
  const text = body.result?.content?.find((part) => part.type === "text")?.text;
  if (!text) throw new Error("empty");
  return JSON.parse(text) as Result[];
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 2000,
  });
  return (
    <button
      type="button"
      onClick={() => copyToClipboard(text)}
      aria-label={label}
      className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] focus-visible:ring-ring inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2"
    >
      {isCopied ? (
        <CheckIcon aria-hidden className="size-3.5" />
      ) : (
        <CopyIcon aria-hidden className="size-3.5" />
      )}
      <span role="status" className="sr-only">
        {isCopied ? "Copied" : ""}
      </span>
    </button>
  );
}

function ClientIcon({ client }: { client: Client }) {
  return (
    <span
      aria-hidden
      className="flex size-4 shrink-0 items-center justify-center [&>*]:size-4!"
    >
      {client.icon}
    </span>
  );
}

/** The frame's one header row, over a hairline. */
const headerRow =
  "border-foreground/10 flex h-11 shrink-0 items-center gap-2 border-b px-2";

function Connect({
  client,
  onClient,
}: {
  client: Client;
  onClient: (id: string) => void;
}) {
  return (
    <>
      <div className={headerRow}>
        <Menu>
          <MenuTrigger
            aria-label={`Coding agent: ${client.label}`}
            className="hover:bg-foreground/[0.05] data-popup-open:bg-foreground/[0.05] h-7 gap-1.5 rounded-md px-2 text-[13px] font-medium"
          >
            <ClientIcon client={client} />
            {client.label}
            <ChevronDownIcon aria-hidden className="text-muted-foreground" />
          </MenuTrigger>
          <MenuContent align="start">
            {CLIENTS.map((entry) => (
              <MenuItem key={entry.id} onClick={() => onClient(entry.id)}>
                <ClientIcon client={entry} />
                <span className="flex-1">{entry.label}</span>
                <CheckIcon
                  aria-hidden
                  className={cn(
                    "ms-4 size-3.5",
                    entry.id === client.id ? "opacity-100" : "opacity-0",
                  )}
                />
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>
        <span className="text-muted-foreground ms-auto min-w-0 truncate font-mono text-xs [font-variant-ligatures:none]">
          {client.file}
        </span>
        <CopyButton
          text={client.code}
          label={`Copy the ${client.label} setup`}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 py-3.5 font-mono text-[13px] leading-relaxed [&_code]:[overflow-wrap:anywhere] [&_code]:whitespace-pre-wrap [&_code]:[font-variant-ligatures:none] [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:p-0">
        <DeferredHighlight
          key={client.id}
          language={client.language}
          theme={{ light: "github-light", dark: "github-dark" }}
          defaultColor="light-dark()"
          addDefaultStyles={false}
          showLanguage={false}
        >
          {client.code}
        </DeferredHighlight>
      </div>
    </>
  );
}

function SearchDocs() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search>({ state: "idle" });

  const run = async (next: string) => {
    const trimmed = next.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setSearch({ state: "loading", query: trimmed });
    try {
      const results = await searchDocs(trimmed);
      setSearch({
        state: "done",
        query: trimmed,
        results: results.slice(0, 4),
      });
    } catch {
      setSearch({ state: "error", query: trimmed });
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void run(query);
  };

  return (
    <>
      <form onSubmit={submit} className={cn(headerRow, "gap-2.5 px-4")}>
        <SearchIcon
          aria-hidden
          className="text-muted-foreground size-4 shrink-0"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the docs, as your agent would"
          aria-label="Search the assistant-ui docs"
          className="placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="submit"
          aria-label="Search"
          disabled={search.state === "loading" || !query.trim()}
          className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] focus-visible:ring-ring inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2 disabled:opacity-0"
        >
          <CornerDownLeftIcon aria-hidden className="size-3.5" />
        </button>
      </form>

      <div aria-live="polite" className="min-h-0 flex-1 overflow-y-auto p-2">
        {search.state === "idle" ? (
          <ul aria-label="Try a search">
            {QUERIES.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => void run(example)}
                  className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03] focus-visible:ring-ring flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-start text-sm transition-colors outline-none focus-visible:ring-2"
                >
                  <SearchIcon aria-hidden className="size-3.5 opacity-50" />
                  {example}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {search.state === "loading" ? (
          <ul aria-label="Searching" className="flex flex-col gap-4 px-2 pt-2">
            {[0, 1, 2].map((row) => (
              <li key={row} className="flex flex-col gap-2">
                <span className="shimmer shimmer-bg bg-muted h-3.5 w-2/5 rounded" />
                <span className="shimmer shimmer-bg bg-muted h-3 w-4/5 rounded" />
              </li>
            ))}
          </ul>
        ) : null}
        {search.state === "error" ? (
          <p className="text-muted-foreground px-2 py-2 text-sm">
            The MCP server did not answer. Try again in a moment.
          </p>
        ) : null}
        {search.state === "done" ? (
          search.results.length === 0 ? (
            <p className="text-muted-foreground px-2 py-2 text-sm">
              No pages match “{search.query}”.
            </p>
          ) : (
            <ul>
              {search.results.map((result) => (
                <li key={result.url}>
                  <a
                    href={result.url}
                    className="hover:bg-foreground/[0.03] focus-visible:ring-ring flex flex-col gap-0.5 rounded-md px-2 py-2 transition-colors outline-none focus-visible:ring-2"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium">
                        {result.title}
                      </span>
                      <span className="text-muted-foreground shrink-0 truncate font-mono text-[11px] [font-variant-ligatures:none]">
                        {result.url}
                      </span>
                    </span>
                    {result.description ? (
                      <span className="text-muted-foreground line-clamp-1 text-[13px]">
                        {result.description}
                      </span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </>
  );
}

/**
 * The assistant-ui MCP server, framed like the home demo: tabs above, one
 * lifted frame, a caption below. Connect shows each agent's setup; Search
 * calls the server's real search_docs tool.
 */
export function McpPanel({ className }: { className?: string }) {
  const [tab, setTab] = useState("connect");
  const [clientId, setClientId] = useState(CLIENTS[0]!.id);
  const client = CLIENTS.find((entry) => entry.id === clientId) ?? CLIENTS[0]!;

  return (
    <section
      aria-label="assistant-ui MCP server"
      className={cn("flex min-w-0 flex-col", className)}
    >
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(String(value))}
        className="gap-3"
      >
        <div className="flex items-center justify-between gap-3">
          <TabsList className="bg-background border-foreground/10 border">
            <TabsTrigger
              value="connect"
              className="data-active:bg-muted flex-none px-2.5 text-[13px]"
            >
              Connect
            </TabsTrigger>
            <TabsTrigger
              value="search"
              className="data-active:bg-muted flex-none px-2.5 text-[13px]"
            >
              Search the docs
            </TabsTrigger>
          </TabsList>
          <span className="flex min-w-0 items-center gap-0.5">
            <span className="text-muted-foreground truncate font-mono text-xs [font-variant-ligatures:none]">
              assistant-ui.com/mcp
            </span>
            <CopyButton text={SERVER_URL} label="Copy the MCP server address" />
          </span>
        </div>
        <div
          className="border-foreground/10 rounded-document bg-background flex h-[17rem] flex-col overflow-hidden border"
          style={LIFT_SHADOW}
        >
          <TabsContent value="connect" className="flex min-h-0 flex-1 flex-col">
            <Connect client={client} onClient={setClientId} />
          </TabsContent>
          <TabsContent value="search" className="flex min-h-0 flex-1 flex-col">
            <SearchDocs />
          </TabsContent>
        </div>
      </Tabs>
      <div className="flex items-baseline justify-between gap-4 pt-3 text-[13px]">
        <p className="text-muted-foreground min-w-0 text-pretty">
          {tab === "connect"
            ? client.note
            : "Results come live from the server's search_docs tool."}
        </p>
        {tab === "connect" && client.deeplink ? (
          <a
            href={client.deeplink.href}
            className="group/link text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 transition-colors"
          >
            {client.deeplink.label}
            <ArrowUpRightIcon
              aria-hidden
              className="size-3.5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 motion-reduce:transition-none"
            />
          </a>
        ) : null}
      </div>
    </section>
  );
}
