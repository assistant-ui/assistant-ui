"use client";

import { BotIcon } from "lucide-react";
import { SetupCommandPrompt } from "@/components/shared/setup-command-prompt";
import { getCatalogItem } from "@/lib/catalog";

/** Docs banner that hands the page's setup to the reader's coding agent; prominent where the agent is the main way to install. */
export function AgentSetup({
  product: slug,
  prominent = false,
}: {
  product: string;
  prominent?: boolean;
}) {
  const product = getCatalogItem(slug);
  if (product === undefined) return null;
  const prompt = (
    <SetupCommandPrompt
      page="docs"
      section="agent_setup"
      products={[product.slug]}
    />
  );

  if (prominent)
    return (
      <aside
        aria-label="Set up with your coding agent"
        className="not-prose border-foreground/15 bg-muted/40 my-6 flex flex-col gap-4 rounded-lg border p-5"
      >
        <div>
          <p className="text-base font-medium">
            Install {product.name} with your coding agent
          </p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Your agent installs it and wires it into your project.
          </p>
        </div>
        {prompt}
      </aside>
    );

  return (
    <aside
      aria-label="Set up with your coding agent"
      className="not-prose border-foreground/15 bg-muted/40 my-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border px-4 py-3 text-sm"
    >
      <BotIcon aria-hidden className="size-4 shrink-0" />
      <p className="min-w-0 flex-1 basis-56">
        You can also use your coding agent to set this up.
      </p>
      {prompt}
    </aside>
  );
}
