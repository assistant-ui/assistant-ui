import { PlaygroundClient } from "./playground-client";
import { isAiBuilderServerAuthConfigured } from "@/lib/ai-builder-auth";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";

export default function PlaygroundPage() {
  return (
    <PlaygroundClient
      aiPlaygroundEnabled={isAiPlaygroundEnabled}
      aiBuilderEnabled={
        isAiPlaygroundEnabled && isAiBuilderServerAuthConfigured()
      }
    />
  );
}
