import {
  AmazonIcon,
  ChatGptIcon,
  ClaudeIcon,
  DeepseekIcon,
  GoogleIcon,
  GrokIcon,
  KimiAiIcon,
  MetaIcon,
  MicrosoftIcon,
  MistralIcon,
  PerplexityAiIcon,
  QwenIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { Icon } from "./base-thread-shell";

/*
 * Modelpedia serves no logos, so a provider is drawn with the mark Hugeicons
 * has for it or for its best-known product, by its Modelpedia id.
 */
const MARKS: Record<string, IconSvgElement> = {
  amazon: AmazonIcon,
  anthropic: ClaudeIcon,
  azure: MicrosoftIcon,
  deepseek: DeepseekIcon,
  google: GoogleIcon,
  meta: MetaIcon,
  mistral: MistralIcon,
  moonshot: KimiAiIcon,
  openai: ChatGptIcon,
  perplexity: PerplexityAiIcon,
  qwen: QwenIcon,
  vertex: GoogleIcon,
  xai: GrokIcon,
};

/** A provider's mark, or its initial in a tile where it has none. 16px. */
export function ProviderIcon({
  id,
  name,
  className,
}: {
  id: string;
  name: string;
  className?: string;
}) {
  const mark = MARKS[id];
  if (mark)
    return <Icon icon={mark} className={cn("size-4 shrink-0", className)} />;

  return (
    <span
      aria-hidden
      className={cn(
        "bg-foreground/10 text-muted-foreground flex size-4 shrink-0 items-center justify-center rounded-[5px] text-[0.625rem] leading-none font-medium uppercase",
        className,
      )}
    >
      {Array.from(name.trim())[0]}
    </span>
  );
}
