import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { MCP_COMMAND, MCP_PROMPT } from "@/lib/library/mcp-data";
import {
  LibraryCodeSnippet,
  type LibrarySnippetTab,
} from "./library-code-snippet";

const INSTALL_TABS: LibrarySnippetTab[] = [
  { label: "CLI", code: MCP_COMMAND, kind: "command" },
  { label: "Agent prompt", code: MCP_PROMPT, kind: "prompt" },
];

export function McpHeroActions() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <LibraryCodeSnippet
        tabs={INSTALL_TABS}
        label="Install with"
        className="w-full max-w-md"
      />
      <Link
        href="/docs/llm#mcp"
        className="group/cta focus-visible:ring-ring bg-foreground/[0.06] hover:bg-foreground/[0.1] inline-flex h-9 items-center gap-2 rounded-(--library-control) px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
      >
        Read the MCP guide
        <ArrowRightIcon
          aria-hidden
          className="size-4 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-0.5 motion-reduce:transition-none"
        />
      </Link>
    </div>
  );
}
