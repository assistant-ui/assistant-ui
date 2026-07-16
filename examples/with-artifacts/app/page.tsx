"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  AuiProvider,
  Suggestions,
  Tools,
  unstable_Interactables,
  useAui,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import {
  ArtifactSurface,
  ArtifactSurfaceProvider,
  useArtifactSurface,
} from "./artifact-surface";
import toolkit from "./toolkit";

function ArtifactExperience() {
  const { active } = useArtifactSurface();

  return (
    <main className="flex h-full min-h-0 overflow-hidden bg-white">
      <section
        className={
          active
            ? "hidden min-w-0 bg-white md:block md:w-[min(44vw,42rem)] md:shrink-0"
            : "min-w-0 flex-1 bg-white"
        }
      >
        <Thread />
      </section>
      <ArtifactSurface />
    </main>
  );
}

function ArtifactScopes() {
  const aui = useAui({
    tools: Tools({ toolkit }),
    unstable_interactables: unstable_Interactables(),
    suggestions: Suggestions([
      {
        title: "Build a landing page",
        label: "with modern styling",
        prompt:
          "Build a beautiful landing page for a coffee shop with modern CSS.",
      },
      {
        title: "Create a calculator",
        label: "with HTML and JavaScript",
        prompt:
          "Create a calculator app with HTML, CSS, and JavaScript that supports basic arithmetic.",
      },
    ]),
  });

  return (
    <AuiProvider value={aui}>
      <ArtifactSurfaceProvider>
        <ArtifactExperience />
      </ArtifactSurfaceProvider>
    </AuiProvider>
  );
}

export default function Home() {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ArtifactScopes />
    </AssistantRuntimeProvider>
  );
}
