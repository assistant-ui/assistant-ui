"use client";

import { ArrowRight } from "lucide-react";
import { useBeginSetup } from "@/components/shared/setup-navigation";
import { Button } from "@/components/ui/button";
import { type ExampleBundle } from "@/lib/example-bundles";

export function BundleSetupButton({ example }: { example: ExampleBundle }) {
  const beginSetup = useBeginSetup();
  return (
    <Button
      onClick={() =>
        beginSetup(
          ["assistant-ui"],
          `Set up the ${example.title} bundle in my project. Read https://www.assistant-ui.com/components/bundles/${example.slug} and its source archive at https://www.assistant-ui.com/example-bundles/${example.slug}/source.tar.gz. Use the assistant-ui shadcn components from the bundle. Ask about my project and model provider, then configure the live backend. Requirements: ${example.requirements}`,
        )
      }
    >
      Set up with your agent
      <ArrowRight aria-hidden data-icon="inline-end" />
    </Button>
  );
}
