import { BotIcon } from "lucide-react";
import { ChoiceIcon } from "@/components/pages/catalog/input-shared";

const AGENT_MARKS: Record<string, string> = {
  claude: "claude",
  codex: "openai",
  gemini: "gemini",
};

/** The mark of a coding agent by the kind the CLI reports (`claude`, `codex`, `gemini`, ...). */
export function AgentKindIcon({
  kind,
  className,
}: {
  kind: string | null | undefined;
  className?: string | undefined;
}) {
  const mark = kind == null ? undefined : AGENT_MARKS[kind];
  if (mark === undefined) return <BotIcon className={className} />;
  return <ChoiceIcon icon={mark} className={className} />;
}
