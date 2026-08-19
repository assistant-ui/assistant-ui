import { Suspense } from "react";
import { PlaygroundClient } from "./playground-client";
import { isAiBuilderServerAuthConfigured } from "@/lib/ai-builder-auth";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";

export default function PlaygroundPage() {
  return (
    <Suspense>
      <PlaygroundClient
        aiPlaygroundEnabled={isAiPlaygroundEnabled}
        aiBuilderEnabled={
          isAiPlaygroundEnabled && isAiBuilderServerAuthConfigured()
        }
      />
    </Suspense>
  );
}
