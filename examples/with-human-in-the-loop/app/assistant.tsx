"use client";

import { useChatRuntime } from "@assistant-ui/ai-sdk";
import {
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { SupportDesk } from "./support-desk";

// A run stops for a person twice in this app: on a human tool until the rep
// picks items, and on an approval gate until the rep decides. Either answer
// sends the conversation back to the route.
const continueWhenAnswered: typeof lastAssistantMessageIsCompleteWithToolCalls =
  (options) =>
    lastAssistantMessageIsCompleteWithToolCalls(options) ||
    lastAssistantMessageIsCompleteWithApprovalResponses(options);

export function Assistant({ scripted }: { scripted: boolean }) {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: continueWhenAnswered,
  });

  return (
    <SupportDesk
      runtime={runtime}
      model={
        scripted
          ? "Scripted model. Set OPENAI_API_KEY to use gpt-6-luna."
          : "gpt-6-luna"
      }
    />
  );
}
