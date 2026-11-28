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
import { PresetMark } from "./preset-card";
import { SkillGlyph } from "./skill-glyphs";

const AgentIcon = dynamic(() =>
  import("./agent-icons").then((module) => module.AgentIcon),
);

// Brand paths from Simple Icons 16 (CC0).
const brand = (path: string) =>
  function Brand({ className }: { className?: string }) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
      >
        <path d={path} />
      </svg>
    );
  };

const PydanticIcon = brand(
  "m23.826 17.316-4.23-5.866-6.847-9.496c-.348-.48-1.151-.48-1.497 0l-6.845 9.494-4.233 5.868a.925.925 0 0 0 .46 1.417l11.078 3.626h.002a.92.92 0 0 0 .572 0h.002l11.077-3.626c.28-.092.5-.31.59-.592a.916.916 0 0 0-.13-.825h.002ZM12.001 4.07l4.44 6.158-4.152-1.36c-.032-.01-.066-.008-.098-.016a.8.8 0 0 0-.096-.016c-.032-.004-.062-.016-.094-.016s-.062.012-.094.016a.74.74 0 0 0-.096.016c-.032.006-.066.006-.096.016L7.59 10.221l-.026.008 4.44-6.158h-.002Zm-6.273 8.7 4.834-1.583.516-.168v9.19L2.41 17.372l3.317-4.6Zm7.197 7.437V11.02l5.35 1.752 3.316 4.598-8.666 2.838Z",
);
const BetterAuthIcon = brand(
  "M0 3.39v17.22h5.783V15.06h6.434V8.939H5.783V3.39ZM12.217 8.94h5.638v6.122h-5.638v5.548H24V3.391H12.217Z",
);

/** The Auth.js shield, a picture from authjs.dev kept in public/library/marks. */
function AuthJsIcon({ className }: { className?: string }) {
  return (
    <img
      src="/library/marks/authjs.png"
      alt=""
      className={cn("object-contain", className)}
    />
  );
}

const LOGOS: Record<string, ComponentType<{ className?: string }>> = {
  a2a: A2AIcon,
  authjs: AuthJsIcon,
  "better-auth": BetterAuthIcon,
  claude: ClaudeIcon,
  cloudflare: CloudflareIcon,
  langfuse: LangfuseIcon,
  mastra: MastraIcon,
  opencode: OpenCodeIcon,
  pydantic: PydanticIcon,
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

/** The sizes a row's preview box takes, the same as a skill's. */
const largeDrawing = "[&>svg]:h-8 [&>svg]:w-[2.667rem]";
const largeLogo = "grid [&>img]:size-5 [&>svg]:size-5";

/**
 * What stands for a library item: its brand's logo, a coding agent's mark, a
 * preset's colors, or one of the library's line drawings, by the key in
 * `LIBRARY_MARKS`. An item
 * with no key, or a key nothing draws, shows the first letter of its name.
 */
export function LibraryMark({
  mark,
  name,
  large = false,
}: {
  mark: string | undefined;
  name: string;
  /** Sized for a row's preview box; otherwise for a tile or a line of text. */
  large?: boolean;
}) {
  const letter = (
    <span aria-hidden className="text-muted-foreground text-xs font-medium">
      {name.charAt(0)}
    </span>
  );
  const [kind = "", id = ""] = mark?.split(":") ?? [];

  switch (kind) {
    case "agent":
      return (
        <AgentIcon
          slug={id}
          fallback={letter}
          className={large ? "size-5" : "size-4"}
        />
      );
    case "logo": {
      const Logo = LOGOS[id];
      if (Logo) {
        return <Logo className={cn("shrink-0", large ? "size-5" : "size-4")} />;
      }
      if (!isFilterLogo(id)) return letter;
      const logo = <FilterIcon name={FILTER_LOGOS[id]} />;
      return large ? <span className={largeLogo}>{logo}</span> : logo;
    }
    case "preset":
      return <PresetMark id={id} large={large} />;
    case "skill":
      return (
        <span
          aria-hidden
          className={cn("grid", large ? largeDrawing : drawing)}
        >
          <SkillGlyph name={id} />
        </span>
      );
    case "section":
      return (
        <span
          aria-hidden
          className={cn("grid", large ? largeDrawing : drawing)}
        >
          <LibraryGlyph id={id as LibrarySectionId} />
        </span>
      );
    case "utility":
      return (
        <span
          aria-hidden
          className={cn("grid", large ? largeDrawing : drawing)}
        >
          <UtilityGlyph name={id} />
        </span>
      );
    default:
      return letter;
  }
}
