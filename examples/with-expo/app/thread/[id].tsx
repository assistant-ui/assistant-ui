import { useLocalSearchParams, Stack } from "expo-router";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { useThreads } from "@/contexts/ThreadsContext";

export default function ThreadDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { threads, getMessages, saveMessages } = useThreads();

  const thread = threads.find((t) => t.id === id);
  const title = thread?.title || "Chat";

  if (!id) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ChatScreen
        threadId={id}
        getMessages={getMessages}
        saveMessages={saveMessages}
      />
    </>
  );
}
