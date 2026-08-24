"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  Tools,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { OpenUIInstructions, openuiIntegration } from "@openuidev/assistant-ui";
import { shouldContinueAfterOpenUIPrompt } from "@openuidev/assistant-ui/ai-sdk";

export default function Home() {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: shouldContinueAfterOpenUIPrompt,
  });

  const config = AuiConfig({
    tools: Tools({ toolkit: openuiIntegration.toolkit }),
    suggestions: Suggestions([
      {
        title: "Trip summary",
        label: "as a display-only card",
        prompt:
          "Show a trip summary for my Tokyo trip: flying March 14 to 21, staying at Park Hyatt Tokyo at $310 a night, total budget $4,200, with three confirmed activities: teamLab Planets, a Tsukiji food tour, and a Hakone day trip.",
      },
      {
        title: "Pick a slot",
        label: "with an interactive choice",
        prompt:
          "Ask me to pick a meeting slot from Tuesday 10:00, Wednesday 14:30, or Friday 09:15.",
      },
      {
        title: "Registration form",
        label: "collect structured input",
        prompt:
          "Collect my conference registration with a form: full name, email, company, and a t-shirt size choice of S, M, L, or XL.",
      },
      {
        title: "Sprint metrics",
        label: "summarized visually",
        prompt:
          "Summarize our sprint: 34 of 41 planned issues closed, velocity 62 points versus 55 last sprint, 3 escaped bugs, and a median cycle time of 2.4 days.",
      },
    ]),
  });

  return (
    <AssistantRuntimeProvider config={config} runtime={runtime}>
      <OpenUIInstructions />
      <div className="h-full">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}
