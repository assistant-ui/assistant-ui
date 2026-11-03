"use client";

import { TemplatePreview } from "@/components/gallery/template-preview";
import { GENERATIVE_ELEMENTS } from "@/lib/generative-elements";
import { defineStates, type ElementStates } from "./types";

const TALL = new Set(["generative-portfolio", "generative-playlist"]);

// The renderer draws nothing for a non-streaming component until its tool call
// is done, so a generative template has no partial state to preview.
function generativeStates(
  slug: string,
  tree: Parameters<typeof TemplatePreview>[0]["tree"],
): ElementStates {
  return defineStates([
    { key: "default", label: "Default" },
    {
      key: "narrow",
      label: "Narrow",
      note: "The same spec in a 280px column, the width of a phone chat bubble.",
      Component: () => (
        <div
          data-aui-theme="elements"
          className={
            TALL.has(slug)
              ? "aui-gallery w-[280px] origin-center scale-[0.68]"
              : "aui-gallery w-[280px] origin-center scale-[0.85]"
          }
        >
          <TemplatePreview tree={tree} />
        </div>
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
