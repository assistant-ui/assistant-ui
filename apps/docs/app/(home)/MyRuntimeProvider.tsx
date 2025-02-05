"use client";
import {
  AssistantCloud,
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  AssistantRuntimeProvider,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

const cloud = new AssistantCloud({
  baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]!,
  authToken: () =>
    fetch("/api/assistant-ui-token", { method: "POST" })
      .then((r) => r.json())
      .then((r) => r.token),
});
export const MyRuntimeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const runtime = useChatRuntime({
    api: "/api/chat",
    cloud,
    adapters: {
      attachments: new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new SimpleTextAttachmentAdapter(),
      ]),
      feedback: {
        submit: ({ message, type }) => {
          console.log({ message, type });
        },
      },
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};
