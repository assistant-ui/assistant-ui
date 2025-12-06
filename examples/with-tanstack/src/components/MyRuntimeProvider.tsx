import { useState, type ReactNode } from "react";
import {
  useExternalStoreRuntime,
  ThreadMessageLike,
  AppendMessage,
  AssistantRuntimeProvider,
} from "@assistant-ui/react";
import { chatStream } from "@/server/chat";

type MyMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const generateId = () => Math.random().toString(36).substring(2, 9);

const convertMessage = (message: MyMessage): ThreadMessageLike => {
  return {
    id: message.id,
    role: message.role,
    content: [{ type: "text", text: message.content }],
  };
};

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<MyMessage[]>([]);

  const onNew = async (message: AppendMessage) => {
    if (message.content[0]?.type !== "text")
      throw new Error("Only text messages are supported");

    const input = message.content[0].text;
    const userMessage: MyMessage = {
      id: generateId(),
      role: "user",
      content: input,
    };

    // Add user message
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Create placeholder for assistant message
    setIsRunning(true);
    const assistantId = generateId();
    const assistantMessage: MyMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Stream response using async generator
      const stream = await chatStream({
        data: {
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      // Handle streaming chunks
      for await (const chunk of stream) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m,
          ),
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Sorry, an error occurred. Please try again." }
            : m,
        ),
      );
    } finally {
      setIsRunning(false);
    }
  };

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    convertMessage,
    onNew,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
