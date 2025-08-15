"use client";
import { WeatherSearchToolUI } from "@/components/tools/weather-tool";
import { GeocodeLocationToolUI } from "@/components/tools/weather-tool";
import {
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  AssistantRuntimeProvider,
  WebSpeechSynthesisAdapter,
} from "@assistant-ui/react";
import { useDataStreamRuntime } from "@assistant-ui/react-data-stream";

export function DocsRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const runtime = useDataStreamRuntime({
    api: "/api/chat",
    maxSteps: 5,
    adapters: {
      attachments: new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new SimpleTextAttachmentAdapter(),
      ]),
      speech: new WebSpeechSynthesisAdapter(),
    },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
      <WeatherSearchToolUI />
      <GeocodeLocationToolUI />
    </AssistantRuntimeProvider>
  );
}
