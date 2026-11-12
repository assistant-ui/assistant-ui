import type { ComponentType, SVGProps } from "react";
import { BotIcon } from "lucide-react";
import { ClaudeIcon } from "@/components/icons/claude";
import { CursorIcon } from "@/components/icons/cursor";
import { GeminiMarkIcon } from "@/components/icons/gemini-mark";
import { OpenCodeIcon } from "@/components/icons/opencode";
import { cn } from "@/lib/utils";

const MARKS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  claude: ClaudeIcon,
  cursor: CursorIcon,
  gemini: GeminiMarkIcon,
  opencode: OpenCodeIcon,
};

/** The mark of a coding agent by the kind the CLI reports (`claude`, `codex`, `gemini`, ...). */
export function AgentKindIcon({
  kind,
  className,
}: {
  kind: string | null | undefined;
  className?: string | undefined;
}) {
  const Mark = kind == null ? undefined : MARKS[kind];
  if (Mark) return <Mark className={className} />;
  if (kind === "codex")
    return (
      <span
        aria-hidden
        className={cn("block bg-current", className)}
        style={{
          maskImage: "url(/icons/openai.svg)",
          maskSize: "contain",
          maskPosition: "center",
          maskRepeat: "no-repeat",
        }}
      />
    );
  return <BotIcon className={className} />;
}
