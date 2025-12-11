import { useLocalSearchParams } from "expo-router";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { useThreads } from "@/contexts/ThreadsContext";

export default function ThreadDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getMessages, saveMessages } = useThreads();

  if (!id) {
    return null;
  }

  return (
    <ChatScreen
      threadId={id}
      getMessages={getMessages}
      saveMessages={saveMessages}
    />
  );
}
