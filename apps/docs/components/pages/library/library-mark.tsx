"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import { A2AIcon } from "@/components/icons/a2a";
import { ClaudeIcon } from "@/components/icons/claude";
import { CloudflareIcon } from "@/components/icons/cloudflare";
import { LangfuseIcon } from "@/components/icons/langfuse";
import { MastraIcon } from "@/components/icons/mastra";
import { OpenCodeIcon } from "@/components/icons/opencode";
import type { LibrarySectionId } from "@/lib/library/library-data";
import { cn } from "@/lib/utils";
import { FilterIcon } from "./filter-icons";
import { LibraryGlyph, UtilityGlyph } from "./library-glyphs";
import { SkillGlyph } from "./skill-glyphs";

const AgentIcon = dynamic(() =>
  import("./agent-icons").then((module) => module.AgentIcon),
);

const LOGOS: Record<string, ComponentType<{ className?: string }>> = {
  a2a: A2AIcon,
  claude: ClaudeIcon,
  cloudflare: CloudflareIcon,
  langfuse: LangfuseIcon,
  mastra: MastraIcon,
  opencode: OpenCodeIcon,
};

/** Brands the starters' filter menu already draws, by the name it knows each by. */
const FILTER_LOGOS = {
  vercel: "AI SDK",
  langgraph: "LangGraph",
  langchain: "LangSmith",
  eve: "Eve",
  adk: "Google ADK",
  agui: "AG-UI",
  openai: "OpenAI SDK",
  clerk: "Clerk",
  "assistant-ui": "Assistant Cloud",
  mcp: "MCP",
  vscode: "VS Code",
} as const;

const isFilterLogo = (name: string): name is keyof typeof FILTER_LOGOS =>
  name in FILTER_LOGOS;

/** A line drawing sized to sit where a logo would. */
const drawing = "[&>svg]:h-[18px] [&>svg]:w-6";

/**
 * What stands for a library item: its brand's logo, a coding agent's mark, or
 * one of the library's line drawings, by the key in `LIBRARY_MARKS`. An item
 * with no key, or a key nothing draws, shows the first letter of its name.
 */
export function LibraryMark({
  mark,
  name,
  className,
}: {
  mark: string | undefined;
  name: string;
  className?: string;
}) {
  const letter = (
    <span aria-hidden className="text-muted-foreground text-xs font-medium">
      {name.charAt(0)}
    </span>
  );
  const [kind = "", id = ""] = mark?.split(":") ?? [];

  switch (kind) {
    case "agent":
      return <AgentIcon slug={id} fallback={letter} className="size-4" />;
    case "logo": {
      const Logo = LOGOS[id];
      if (Logo) return <Logo className="size-4 shrink-0" />;
      return isFilterLogo(id) ? <FilterIcon name={FILTER_LOGOS[id]} /> : letter;
    }
    case "skill":
      return (
        <span aria-hidden className={cn("grid", drawing, className)}>
          <SkillGlyph name={id} />
        </span>
      );
    case "section":
      return (
        <span aria-hidden className={cn("grid", drawing, className)}>
          <LibraryGlyph id={id as LibrarySectionId} />
        </span>
      );
    case "utility":
      return (
        <span aria-hidden className={cn("grid", drawing, className)}>
          <UtilityGlyph name={id} />
        </span>
      );
    default:
      return letter;
  }
}
