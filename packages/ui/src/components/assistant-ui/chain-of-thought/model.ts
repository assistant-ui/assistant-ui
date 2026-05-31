import {
  AlertCircleIcon,
  CheckCircleIcon,
  FileTextIcon,
  GitMergeIcon,
  GlobeIcon,
  ImageIcon,
  SearchIcon,
  TerminalIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

export const stepTypeIcons = {
  search: SearchIcon,
  web_search: GlobeIcon,
  image: ImageIcon,
  text: FileTextIcon,
  code: TerminalIcon,
  javascript: TerminalIcon,
  merge: GitMergeIcon,
  write: FileTextIcon,
  tool: WrenchIcon,
  complete: CheckCircleIcon,
  error: AlertCircleIcon,
  default: null,
} as const satisfies Record<string, LucideIcon | null>;

export type ChainOfThoughtPhase =
  | "idle"
  | "running"
  | "requires-action"
  | "complete"
  | "incomplete";

export const derivePhase = ({
  partsLength,
  isStreaming,
  hasRequiresAction,
  hasIncomplete,
}: {
  partsLength: number;
  isStreaming: boolean;
  hasRequiresAction: boolean;
  hasIncomplete: boolean;
}): ChainOfThoughtPhase => {
  if (partsLength === 0) return "idle";
  if (hasRequiresAction) return "requires-action";
  if (isStreaming) return "running";
  if (hasIncomplete) return "incomplete";
  return "complete";
};

export type StepType = keyof typeof stepTypeIcons;

export type StepStatus = "pending" | "active" | "complete" | "error";

const enPluralRules = new Intl.PluralRules("en-US");

export const pluralize = (
  count: number,
  singular: string,
  plural = `${singular}s`,
  rules: Intl.PluralRules = enPluralRules,
): string => (rules.select(count) === "one" ? singular : plural);
