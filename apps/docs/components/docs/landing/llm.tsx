import { DEMO_META } from "@/lib/demos-meta";
import { GROUPS } from "@/components/docs/landing/quick-links";
import { RUNTIMES } from "@/components/docs/landing/runtime-grid";

/**
 * Text equivalents for the landing components. The interactive versions render
 * an iframe and a clipboard button, which carry no meaning once flattened to
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

export const DemoShowcaseLLM = () => (
  <ul>
    {DEMO_META.map((demo) => (
      <li key={demo.slug}>
        <a href={`/demos/${demo.slug}`}>{demo.name}</a> — {demo.tagline}
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
