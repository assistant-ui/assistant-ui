"use client";

import { useAssistantInstructions } from "@assistant-ui/react";
import { toSpecCatalog } from "@assistant-ui/generative-ui/spec";
import {
  createWidgetToolkit,
  useWidgetInstructions,
} from "generative-frame/assistant-ui";
import { createSpecToolkit } from "generative-frame/spec/assistant-ui";
import {
  SpecPlaceholder,
  type SpecPlaceholderProps,
} from "generative-frame/spec/react";
import { styledGenerativeUILibrary } from "@/components/assistant-ui/elements/generative-ui";

const { catalog, components } = toSpecCatalog(styledGenerativeUILibrary);

function Placeholder(props: SpecPlaceholderProps) {
  if (props.reason !== "pending") return <SpecPlaceholder {...props} />;
  return (
    <span
      aria-hidden="true"
      className="shimmer text-muted-foreground inline-block py-1.5 text-sm leading-none motion-reduce:animate-none"
    >
      Building…
    </span>
  );
}

export const generativeUI = createWidgetToolkit({
  widget: { maxHeight: 720 },
  spec: createSpecToolkit(catalog, {
    components,
    placeholder: Placeholder,
    specPrompt: {
      customRules: [
        "Show what can be seen: call `search_images` once for the places, dishes, or products the answer is about, bind each `Image` `src` and `alt` to its result, and credit Wikipedia in a `Caption`.",
      ],
    },
  }),
});

export function GenerativeUIInstructions() {
  useWidgetInstructions(generativeUI.tools, { preload: { modules: ["spec"] } });
  useAssistantInstructions(
    "Build dashboards, plans, comparisons, and calculators whose amounts follow an input such as a guest count with `render_spec`, computing values with `$calc`. The components include charts, tabs, figures, and tables, so a dashboard is a spec and never needs `show_widget` or the `data_viz` module. Use `show_widget` only for games, simulations, and drawings the components cannot show. Use `present` only for the `Weather` card of a `get_weather` result. When an answer is about places, dishes, or products, call `search_images` for them before `render_spec`, so the answer can show photos.",
  );
  return null;
}
