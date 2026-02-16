import { useEffect } from "react";
import { useLocalSearchParams, Stack } from "expo-router";
import {
  useAssistantRuntime,
  useThreadList,
  ThreadProvider,
  ComposerProvider,
} from "@assistant-ui/react-native";
import { ChatScreen } from "@/components/chat/ChatScreen";

export default function ThreadDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const runtime = useAssistantRuntime();
  const threadList = useThreadList();

  useEffect(() => {
    if (id && id !== "new") {
      runtime.threads.switchToThread(id);
    } else if (id === "new") {
      runtime.threads.switchToNewThread();
    }
  }, [id, runtime]);

  const threadItem = id ? threadList.threadItems[id] : undefined;
  const title = threadItem?.title || "Chat";

  return (
    <ThreadProvider runtime={runtime.thread}>
      <ComposerProvider runtime={runtime.thread.composer}>
        <Stack.Screen options={{ title }} />
        <ChatScreen />
      </ComposerProvider>
    </ThreadProvider>
  );
}
