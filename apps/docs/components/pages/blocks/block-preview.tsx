"use client";

import type { ComponentType } from "react";
import { AgentDocumentEditorPreview } from "./previews/agent-document-editor";

const PREVIEWS: Record<string, ComponentType> = {
  "agent-document-editor": AgentDocumentEditorPreview,
};

export const hasBlockPreview = (slug: string) => slug in PREVIEWS;

/** The block itself, running against the docs chat route and filling its frame. */
export function BlockPreview({ slug }: { slug: string }) {
  const Preview = PREVIEWS[slug];
  if (!Preview) return null;
  return (
    <div className="h-full w-full min-w-0 text-start">
      <Preview />
    </div>
  );
}
