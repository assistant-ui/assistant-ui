"use client";

import { GenerationLoader } from "@/components/assistant-ui/elements/loading-state";
import { defineStates } from "./types";

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "long-content",
    label: "Long label",
    note: "A label that names a slow job stays centered under the grid.",
    Component: () => (
      <GenerationLoader
        label="Rendering 4 product shots from your brief"
        tick={9}
        variant="squares"
      />
    ),
  },
]);
