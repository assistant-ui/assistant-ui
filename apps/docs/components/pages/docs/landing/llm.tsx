import type { ReactNode } from "react";
import { GROUPS } from "@/components/pages/docs/landing/quick-links";
import { RUNTIMES } from "@/components/pages/docs/landing/runtime-grid";
import { SURFACES } from "@/components/pages/docs/landing/surface-grid";
import { DEFAULT_PLATFORM } from "@/lib/constants";
import {
  isSurface,
  PLATFORM_ENTRY_PATHS,
  PLATFORM_QUICKSTART_COMMANDS,
} from "@/lib/docs-platform";
import type { LLMRenderContext } from "@/lib/get-llm-text";
import {
  AGENT_SETUP_HINT,
  AGENT_SETUP_PROMPT,
  pageSetupPreamble,
} from "@/lib/agent-setup-prompt";
import { getCatalogItem } from "@/lib/catalog";

/**
 * Text equivalents for the landing components. The interactive versions render
 * a clipboard button or icon grid, which carry no meaning once flattened to
 * markdown for `.md`, `llms.txt` and the MCP docs server.
 */

/** `text` with its backtick spans as <code>, so the markdown keeps them as code instead of escaping the backticks. */
const withInlineCode = (text: string) =>
  text
    .split("`")
    .map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : part));

export const QuickstartLLM = (
  _props: Record<string, never>,
  ctx?: LLMRenderContext,
) => {
  const platform =
    ctx?.platform && isSurface(ctx.platform) ? ctx.platform : DEFAULT_PLATFORM;
  if (platform === "react")
    return (
      <>
        <p>
          Ask your coding agent to <code>{AGENT_SETUP_PROMPT}</code>.
        </p>
        <p>{withInlineCode(AGENT_SETUP_HINT)}</p>
        <p>
          To install by hand, follow the{" "}
          <a href="/docs/manual-installation">manual installation guide</a>.
        </p>
      </>
    );
  return (
    <>
      <pre>{PLATFORM_QUICKSTART_COMMANDS[platform]}</pre>
      <p>
        Already have an app? See{" "}
        <a href={PLATFORM_ENTRY_PATHS[platform]}>
          adding assistant-ui to an existing project
        </a>
        .
      </p>
    </>
  );
};

/** The installation page's prompt, with what the agent runs for it. */
export const AgentSetupPromptLLM = () => (
  <>
    <pre>{AGENT_SETUP_PROMPT}</pre>
    <p>{withInlineCode(AGENT_SETUP_HINT)}</p>
  </>
);

/** A guide's setup for agents: the setup command for its product, then the manual steps that follow. */
export const AgentSetupLLM = ({
  product,
  section = false,
}: {
  product: string;
  section?: boolean;
}) => {
  // Only a Setup section has manual steps after it; the banner variant adds nothing for agents.
  const item = section ? getCatalogItem(product) : undefined;
  return item ? <p>{withInlineCode(pageSetupPreamble([item.slug]))}</p> : null;
};

/** The manual steps stay in the markdown in full, never collapsed. */
export const ManualStepsLLM = ({ children }: { children?: ReactNode }) => (
  <>{children}</>
);

export const SurfaceGridLLM = () => (
  <ul>
    {SURFACES.map((surface) => (
      <li key={surface.href}>
        <a href={surface.href}>{surface.label}</a>: {surface.description}
      </li>
    ))}
  </ul>
);

export const RuntimeGridLLM = () => (
  <ul>
    {RUNTIMES.map((runtime) => (
      <li key={runtime.href}>
        <a href={runtime.href}>{runtime.label}</a>
      </li>
    ))}
  </ul>
);

export const QuickLinksLLM = () => (
  <>
    {GROUPS.map((group) => (
      <ul key={group.label}>
        {group.links.map((link) => (
          <li key={link.href}>
            {group.label}: <a href={link.href}>{link.label}</a>
          </li>
        ))}
      </ul>
    ))}
  </>
);
