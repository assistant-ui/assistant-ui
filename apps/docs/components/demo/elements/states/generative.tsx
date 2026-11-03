"use client";

import { renderGenerativeUI } from "@assistant-ui/generative-ui/react";
import type { UINode, UISpec } from "@assistant-ui/generative-ui";
import { styledGenerativeUILibrary } from "@/components/assistant-ui/elements/generative-ui";
import { GENERATIVE_ELEMENTS } from "@/lib/generative-elements";
import { defineStates, type ElementStates } from "./types";

const TALL = new Set(["generative-portfolio", "generative-playlist"]);

function truncate(spec: UISpec, keep: (count: number) => number): UISpec {
  if (Array.isArray(spec)) return spec.slice(0, Math.max(1, keep(spec.length)));
  const node = spec as UINode & { children?: UINode[] };
  if (!Array.isArray(node.children)) return node;
  return {
    ...node,
    children: node.children.slice(0, keep(node.children.length)),
  } as UINode;
}

function Frame({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-aui-theme="elements"
      className={
        TALL.has(slug)
          ? "aui-gallery w-full max-w-sm origin-center scale-[0.68]"
          : "aui-gallery w-full max-w-sm origin-center scale-[0.85]"
      }
    >
      {children}
    </div>
  );
}

function generativeStates(slug: string, tree: UISpec): ElementStates {
  const partial = truncate(tree, (count) => Math.ceil(count / 2));
  const first = truncate(tree, () => 1);
  return defineStates([
    { key: "default", label: "Done" },
    {
      key: "streaming",
      label: "Streaming",
      note: "Half of the spec has arrived and props are still streaming.",
      Component: () => (
        <Frame slug={slug}>
          {renderGenerativeUI(partial, styledGenerativeUILibrary, {
            status: "streaming",
          })}
        </Frame>
      ),
    },
    {
      key: "first-node",
      label: "First node",
      note: "Only the first child has arrived; the rest of the card is not drawn yet.",
      Component: () => (
        <Frame slug={slug}>
          {renderGenerativeUI(first, styledGenerativeUILibrary, {
            status: "streaming",
          })}
        </Frame>
      ),
    },
  ]);
}

export const GENERATIVE_STATES: Record<string, ElementStates> =
  Object.fromEntries(
    GENERATIVE_ELEMENTS.map((entry) => [
      entry.slug,
      generativeStates(entry.slug, entry.template.tree),
    ]),
  );
