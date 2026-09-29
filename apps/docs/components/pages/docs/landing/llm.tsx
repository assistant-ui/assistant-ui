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

/**
 * Text equivalents for the landing components. The interactive versions render
 * a clipboard button or icon grid, which carry no meaning once flattened to
 * markdown for `.md`, `llms.txt` and the MCP docs server.
 */

export const QuickstartLLM = (
  _props: Record<string, never>,
  ctx?: LLMRenderContext,
) => {
  const platform =
    ctx?.platform && isSurface(ctx.platform) ? ctx.platform : DEFAULT_PLATFORM;
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
