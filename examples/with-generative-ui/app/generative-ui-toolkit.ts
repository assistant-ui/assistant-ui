"use client";

import { styledGenerativeUILibrary } from "@/components/assistant-ui/elements/generative-ui";
import { toSpecCatalog } from "@assistant-ui/generative-ui/spec";
import { createWidgetToolkit } from "generative-frame/assistant-ui";
import { createSpecToolkit } from "generative-frame/spec/assistant-ui";

const { catalog, components } = toSpecCatalog(styledGenerativeUILibrary);

const photoRules = [
  "Show what can be seen: call `search_images` once for the places, dishes, or products the answer is about, bind each `Image` `src` and `alt` to its result, and credit Wikipedia in a `Caption`.",
];

export const widgets = createWidgetToolkit({
  widget: { maxHeight: 720 },
  spec: createSpecToolkit(catalog, {
    components,
    specPrompt: { customRules: photoRules },
  }),
});
