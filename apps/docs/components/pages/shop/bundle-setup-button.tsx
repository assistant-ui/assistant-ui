"use client";

import { ArrowRight } from "lucide-react";
import { SetupLink, useBeginSetup } from "@/components/shared/setup-navigation";
import { Button } from "@/components/ui/button";
import { useCheckoutSession } from "@/lib/checkout/session-store";
import { type ExampleBundle } from "@/lib/example-bundles";

export function BundleSetupButton({ example }: { example: ExampleBundle }) {
  const beginSetup = useBeginSetup();
  const session = useCheckoutSession();
  if (session)
    return (
      <div className="space-y-2">
        <Button render={<SetupLink />} nativeButton={false}>
          Resume current setup
          <ArrowRight aria-hidden data-icon="inline-end" />
        </Button>
        <p className="text-muted-foreground text-xs">
          Finish your current setup before starting this bundle.
        </p>
      </div>
    );
  return (
    <Button
      onClick={() =>
        beginSetup(
          ["assistant-ui"],
          `Set up the ${example.title} bundle in my project. Read ${window.location.origin}/components/bundles/${example.slug} and its source archive at ${window.location.origin}/example-bundles/${example.slug}/source.tar.gz. Use the assistant-ui shadcn components from the bundle. Ask about my project and model provider, then configure the live backend. Requirements: ${example.requirements}`,
        )
      }
    >
      Set up with your agent
      <ArrowRight aria-hidden data-icon="inline-end" />
    </Button>
  );
}
