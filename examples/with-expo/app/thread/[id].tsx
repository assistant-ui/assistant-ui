import { useEffect, useSyncExternalStore } from "react";
import { useLocalSearchParams, Stack } from "expo-router";
import { ChatScreen } from "@/components/chat/ChatScreen";
import { useRuntime } from "@/contexts/RuntimeContext";

export default function ThreadDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const runtime = useRuntime();

  // Switch to this thread when the page loads
  useEffect(() => {
    if (id) {
      runtime.switchToThread(id);
    }
  }, [id, runtime]);

  // Subscribe to thread list state to get the title
  const threadListState = useSyncExternalStore(
    (callback) => runtime.threadList.subscribe(callback),
    () => runtime.threadList.getState(),
    () => runtime.threadList.getState(),
  );

  const thread = threadListState.threads.find((t) => t.id === id);
  const title = thread?.title || "Chat";

  if (!id) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ChatScreen runtime={runtime} />
    </>
  );
}
