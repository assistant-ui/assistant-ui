"use client";

import { Artifacts } from "@/components/examples/artifacts";
import { Shadcn } from "@/components/examples/shadcn";
import { ArtifactsRuntimeProvider } from "@/contexts/ArtifactsRuntimeProvider";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";
import type { ExamplePreviewSlug } from "./example-preview-data";

export function ExamplePreviewSurface({ slug }: { slug: ExamplePreviewSlug }) {
  if (slug === "ai-sdk") {
    return (
      <DocsRuntimeProvider>
        <Shadcn />
      </DocsRuntimeProvider>
    );
  }

  if (slug === "artifacts") {
    return (
      <ArtifactsRuntimeProvider>
        <Artifacts />
      </ArtifactsRuntimeProvider>
    );
  }

  return (
    <iframe
      title="Form Filling Co-Pilot demo"
      className="h-full w-full border-none"
      src="https://assistant-ui-form-demo.vercel.app/"
    />
  );
}
