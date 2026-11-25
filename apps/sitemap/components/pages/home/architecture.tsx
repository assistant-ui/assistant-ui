"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * The layers from the docs' Architecture page ("What each layer owns"), in the
 * order a message travels: rendered, held, translated, produced, and stored.
 * An example in `code` is a name you would type.
 */
const LAYERS = [
  {
    id: "ui",
    label: "UI",
    description: "Components and primitives render the chat.",
    examples: [
      "Thread",
      "Messages",
      "Composer",
      "Message parts",
      "Action bar",
      "Attachments",
      "Suggestions",
    ],
    href: "/library/components",
    link: "Browse components",
  },
  {
    id: "runtime",
    label: "Runtime",
    description: "Owns the conversation between the UI and the backend.",
    examples: [
      "Messages",
      "Run state",
      "Branching",
      "Editing",
      "Regeneration",
      "`LocalRuntime`",
      "`ExternalStoreRuntime`",
    ],
    href: "/docs/runtimes/concepts/architecture",
    link: "Runtime architecture",
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "Adapters and protocols connect any backend.",
    examples: [
      "AI SDK",
      "LangGraph",
      "LangChain",
      "ADK",
      "A2A",
      "AG-UI",
      "OpenCode",
      "`DataStream`",
      "`AssistantTransport`",
    ],
    href: "/library/runtimes",
    link: "Browse runtimes",
  },
  {
    id: "backend",
    label: "Backend",
    description: "Your agent produces the replies.",
    examples: [
      "Text",
      "Message parts",
      "Tool calls",
      "Agent state",
      "Metadata",
    ],
    href: "/docs/runtimes/pick-a-runtime",
    link: "Pick a runtime",
  },
  {
    id: "persistence",
    label: "Persistence",
    description: "Threads and history, kept in Cloud or your database.",
    examples: [
      "Assistant Cloud",
      "Your database",
      "Thread adapters",
      "History adapters",
    ],
    href: "/docs/cloud",
    link: "Assistant Cloud",
  },
] as const;

function Example({ text }: { text: string }) {
  const code = text.startsWith("`");
  return (
    <span
      className={cn(
        "bg-foreground/[0.04] rounded-sm px-1.5 py-0.5 text-xs",
        code && "font-mono [font-variant-ligatures:none]",
      )}
    >
      {code ? text.slice(1, -1) : text}
    </span>
  );
}

/**
 * assistant-ui's layers, drawn like the Timeline element: a numbered rail of
 * dots, the layer and its one-line description beside each. A click opens a
 * layer's examples and link; another click, or opening a different layer,
 * closes it, so every layer can be closed.
 */
export function Architecture({ className }: { className?: string }) {
  return (
    <AccordionPrimitive.Root
      aria-label="How assistant-ui is built"
      className={cn("flex w-full max-w-2xl flex-col", className)}
    >
      {LAYERS.map((layer, index) => {
        const last = index === LAYERS.length - 1;
        return (
          <AccordionPrimitive.Item
            key={layer.id}
            value={layer.id}
            className="group/layer grid grid-cols-[1.5rem_1rem_minmax(0,1fr)] gap-x-2"
          >
            <span className="text-muted-foreground pt-[7px] text-end font-mono text-[11px] tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span aria-hidden className="flex flex-col items-center">
              <span className="border-muted-foreground mt-[9px] size-2 shrink-0 rounded-full border ring-0 transition-[background-color,border-color,box-shadow] group-data-open/layer:border-blue-500 group-data-open/layer:bg-blue-500 group-data-open/layer:ring-4 group-data-open/layer:ring-blue-500/15 motion-reduce:transition-none dark:group-data-open/layer:bg-blue-400" />
              {last ? null : <span className="bg-foreground/15 w-px flex-1" />}
            </span>
            <div className={cn("min-w-0", !last && "pb-2")}>
              <AccordionPrimitive.Header>
                <AccordionPrimitive.Trigger className="hover:bg-foreground/[0.025] focus-visible:ring-ring -mx-2 flex w-[calc(100%+1rem)] min-w-0 flex-col gap-0.5 rounded-md px-2 py-1 text-start outline-none focus-visible:ring-1 sm:flex-row sm:items-baseline sm:gap-3">
                  <span className="text-foreground/90 shrink-0 text-sm group-data-open/layer:font-medium sm:w-24">
                    {layer.label}
                  </span>
                  <span className="text-muted-foreground min-w-0 text-[13px]">
                    {layer.description}
                  </span>
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Panel className="data-closed:animate-accordion-up data-open:animate-accordion-down overflow-hidden motion-reduce:animate-none">
                <div className="flex flex-col gap-2.5 pt-2 pb-2 sm:ps-[6.75rem]">
                  <div className="flex flex-wrap gap-1.5">
                    {layer.examples.map((example) => (
                      <Example key={example} text={example} />
                    ))}
                  </div>
                  <Link
                    href={layer.href}
                    className="group/link text-foreground/80 hover:text-foreground inline-flex w-fit items-center gap-1 text-[13px] transition-colors"
                  >
                    {layer.link}
                    <ArrowRightIcon
                      aria-hidden
                      className="size-3.5 transition-transform group-hover/link:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </Link>
                </div>
              </AccordionPrimitive.Panel>
            </div>
          </AccordionPrimitive.Item>
        );
      })}
    </AccordionPrimitive.Root>
  );
}
