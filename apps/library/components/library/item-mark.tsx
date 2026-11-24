import type { ComponentType } from "react";
import Image from "next/image";
import { A2AIcon } from "@/components/icons/a2a";
import { AguiIcon } from "@/components/icons/agui";
import { ClaudeIcon } from "@/components/icons/claude";
import { CloudflareIcon } from "@/components/icons/cloudflare";
import { LangChainIcon } from "@/components/icons/langchain";
import { LangfuseIcon } from "@/components/icons/langfuse";
import { LangGraphIcon } from "@/components/icons/langgraph";
import { MastraIcon } from "@/components/icons/mastra";
import { McpIcon } from "@/components/icons/mcp";
import { OpenCodeIcon } from "@/components/icons/opencode";
import { VercelIcon } from "@/components/icons/vercel";
import { BASE_URL } from "@/lib/constants";
import type { LibraryItem, LibraryMark } from "@/lib/library/catalog";
import { ItemGlyph } from "./item-glyph";

const MARKS: Record<LibraryMark, ComponentType<{ className?: string }>> = {
  a2a: A2AIcon,
  // The docs app's ADK icon is an image in that app's public folder, so it is
  // read from the docs site here.
  adk: (props) => (
    <Image
      src={`${BASE_URL}/icons/agent-development-kit.png`}
      alt=""
      width={20}
      height={20}
      {...props}
    />
  ),
  agui: AguiIcon,
  claude: ClaudeIcon,
  cloudflare: CloudflareIcon,
  langchain: LangChainIcon,
  langfuse: LangfuseIcon,
  langgraph: LangGraphIcon,
  mastra: MastraIcon,
  mcp: McpIcon,
  opencode: OpenCodeIcon,
  vercel: VercelIcon,
};

/** The square that stands for an item: its screenshot, its brand, or its glyph. */
export function ItemMark({ item }: { item: LibraryItem }) {
  if (item.preview?.kind === "image") {
    const { light, dark } = item.preview;
    return (
      <span className="border-foreground/10 rounded-document relative size-11 shrink-0 overflow-hidden border">
        <Image
          src={light}
          alt=""
          fill
          sizes="44px"
          className="object-cover object-top dark:hidden"
        />
        <Image
          src={dark}
          alt=""
          fill
          sizes="44px"
          className="hidden object-cover object-top dark:block"
        />
      </span>
    );
  }

  const Mark = item.mark ? MARKS[item.mark] : undefined;
  return (
    <span className="border-foreground/10 bg-background text-muted-foreground rounded-document grid size-11 shrink-0 place-items-center border">
      {Mark ? (
        <Mark className="text-foreground size-5" />
      ) : (
        <ItemGlyph item={item} />
      )}
    </span>
  );
}
