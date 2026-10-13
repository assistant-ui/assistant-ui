"use client";

import { styledGenerativeUILibrary } from "@/components/assistant-ui/elements/generative-ui";
import { toSpecCatalog } from "@assistant-ui/generative-ui/spec";
import { createWidgetToolkit } from "generative-frame/assistant-ui";
import { createSpecToolkit } from "generative-frame/spec/assistant-ui";

const { catalog, components } = toSpecCatalog(styledGenerativeUILibrary);

const compositionRules = [
  "Open with a `Header` that names the answer and a `Text` with the one-line takeaway, then give each part of the answer its own section.",
  "Show what can be seen: call `search_images` once for the places, dishes, or products the answer is about, bind each `Image` `src` and `alt` to its result, and credit Wikipedia in a `Caption`. Lead with two or three photos in a `Row`, or put a `sm` photo beside each item's text.",
  "Put stops with coordinates on a `Map`, with `route` for a trip. Lay out a schedule or itinerary as a `Timeline`, instructions as `Steps`, and attributes across several options as a `Table`.",
  "Make each module a `Card`: a summary, a checklist, a form, or one option. Put the answer's key figures side by side in a `Row` of `Fact`s, and short tags such as a duration or a price tier in `Badge`s.",
  "Keep lists in `/state` and render them with `repeat`, so a full answer stays within the element budget.",
];

export const widgets = createWidgetToolkit({
  widget: { maxHeight: 720 },
  spec: createSpecToolkit(catalog, {
    components,
    specPrompt: { customRules: compositionRules },
  }),
});
