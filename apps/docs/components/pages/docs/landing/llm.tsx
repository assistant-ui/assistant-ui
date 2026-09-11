import { GROUPS } from "@/components/pages/docs/landing/quick-links";
import { RUNTIMES } from "@/components/pages/docs/landing/runtime-grid";
import { SURFACES } from "@/components/pages/docs/landing/surface-grid";

/**
 * Text equivalents for the landing components. The interactive versions render
 * a clipboard button or icon grid, which carry no meaning once flattened to
 * markdown for `.md`, `llms.txt` and the MCP docs server.
 */

export const QuickstartLLM = () => (
  <>
    <pre>npx assistant-ui@latest create</pre>
    <p>
      Already have an app? See{" "}
      <a href="/docs/installation">
        adding assistant-ui to an existing project
      </a>
      .
    </p>
  </>
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
