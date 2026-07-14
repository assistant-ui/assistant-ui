import type { ReactNode } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";

const transport = new AssistantChatTransport({
  api: "https://api.example.com/chat",
});

export function ElectronRuntimeProvider({ children }: { children: ReactNode }) {
  const runtime = useChatRuntime({ transport });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
