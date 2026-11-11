"use client";

import { ArrowRight } from "lucide-react";
import { SetupPromptTrigger } from "@/components/shared/setup-command-prompt";
import { Button } from "@/components/ui/button";
import { BASE_URL } from "@/lib/constants";
import { type ExampleBundle } from "@/lib/example-bundles";

export function BundleSetupButton({ example }: { example: ExampleBundle }) {
  return (
    <SetupPromptTrigger
      page="bundle"
      section={example.slug}
      notes={`Set up the ${example.title} bundle in my project. Read ${BASE_URL}/components/bundles/${example.slug} and its source archive at ${BASE_URL}/example-bundles/${example.slug}/source.tar.gz. Use the assistant-ui shadcn components from the bundle. Ask about my project and model provider, then configure the live backend. Requirements: ${example.requirements}`}
      trigger={<Button />}
    >
      Copy setup prompt
      <ArrowRight aria-hidden data-icon="inline-end" />
    </SetupPromptTrigger>
  );
}
