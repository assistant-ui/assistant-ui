import "server-only";

import { ELEMENT_INDEX } from "../element-index";
import type { CatalogItem } from "../types";

type PromptedCatalogItem = CatalogItem & { agent: string };

const prefix = "elements/";

const elementProductSlug = (elementSlug: string) => `${prefix}${elementSlug}`;

const runtimeWiredAgent = (title: string, registryItem: string) =>
  `This element reads its state from an assistant-ui runtime. If the project has no AssistantRuntimeProvider yet, stop and tell the user to set up assistant-ui first; do not scaffold a runtime as a side effect of adding an element.

1. Check components.json. If it has no "@assistant-ui" registry, add \`"@assistant-ui": "https://r.assistant-ui.com/{name}.json"\` under "registries". If components.json is missing, run \`npx shadcn@latest init --yes\` first.
2. Run \`npx shadcn@latest add @assistant-ui/${registryItem} --yes\`.
3. Read the "With a runtime" part of the docs page above and render ${title} where it says, inside the existing AssistantRuntimeProvider. Reuse the project's thread and composer; do not add a second one.

Verify: start the dev server, open the page that renders the thread, and confirm ${title} appears and responds to the runtime state the docs describe.`;

const standaloneAgent = (title: string, registryItem: string) =>
  `This element is a props-only component and works with or without an assistant-ui runtime.

1. Check components.json. If it has no "@assistant-ui" registry, add \`"@assistant-ui": "https://r.assistant-ui.com/{name}.json"\` under "registries". If components.json is missing, run \`npx shadcn@latest init --yes\` first.
2. Run \`npx shadcn@latest add @assistant-ui/${registryItem} --yes\`.
3. Ask the user where ${title} should appear if the project does not make it obvious, then render it there with the props the docs page above lists. Feed it the project's real data; use the docs' sample data only when none exists yet, and say so.

Verify: start the dev server, open the page that renders ${title}, and confirm it shows without console errors.`;

const ELEMENT_PROMPT_PRODUCTS: readonly PromptedCatalogItem[] =
  ELEMENT_INDEX.map(([slug, title, registryItem, runtimeWired]) => ({
    slug: elementProductSlug(slug),
    name: title,
    tagline: runtimeWired
      ? "Element, wired to the assistant-ui runtime."
      : "Element, props-only.",
    href: `/elements/${slug}`,
    purchase: "cart",
    glyph: "elements",
    docs: `/elements/${slug}`,
    agentMinutes: [2, 5],
    agent: runtimeWired
      ? runtimeWiredAgent(title, registryItem)
      : standaloneAgent(title, registryItem),
  }));

export const ELEMENT_AGENT_PROMPTS = new Map<string, string>(
  ELEMENT_PROMPT_PRODUCTS.map((product): [string, string] => [
    product.slug,
    product.agent,
  ]),
);
