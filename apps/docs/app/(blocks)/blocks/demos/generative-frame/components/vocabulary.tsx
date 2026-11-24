"use client";

import { toSpecCatalog } from "@assistant-ui/generative-ui/spec";
import {
  SpecPlaceholder,
  type SpecPlaceholderProps,
} from "generative-frame/spec/react";
import { styledGenerativeUILibrary } from "@/components/assistant-ui/elements/generative-ui";

/*
 * The components a spec is drawn with: assistant-ui's generative UI
 * vocabulary (cards, facts, tables, charts, tabs, steps, forms, controls),
 * styled. The chat and the gallery draw with the same set.
 */
export const { catalog, components } = toSpecCatalog(styledGenerativeUILibrary);

/* A part still on its way takes no space: the status line under the reply already says it is coming. */
export function Placeholder(props: SpecPlaceholderProps) {
  if (props.reason === "pending") return null;
  return <SpecPlaceholder {...props} />;
}
