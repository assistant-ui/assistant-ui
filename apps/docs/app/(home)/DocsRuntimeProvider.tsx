"use client";
import { WeatherSearchToolUI } from "@/components/tools/weather-tool";
import { GeocodeLocationToolUI } from "@/components/tools/weather-tool";
import {
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  AssistantRuntimeProvider,
  WebSpeechSynthesisAdapter,
  AssistantCloud,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

export function DocsRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const assistantCloud = new AssistantCloud({
    baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]!,
    anonymous: true,
  });

  const runtime = useChatRuntime({
    api: "/api/chat",
    adapters: {
      attachments: new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new SimpleTextAttachmentAdapter(),
      ]),
      speech: new WebSpeechSynthesisAdapter(),
    },
    cloud: assistantCloud,
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
      <WeatherSearchToolUI />
      <GeocodeLocationToolUI />
    </AssistantRuntimeProvider>
  );
}
