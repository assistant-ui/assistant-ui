import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useAssistantRuntime, useThreadList } from "@assistant-ui/react-native";
import { ThreadListScreen } from "@/components/thread-list/ThreadListScreen";

export default function ThreadListPage() {
  const router = useRouter();
  const runtime = useAssistantRuntime();
  const threadList = useThreadList();

  const handleThreadPress = useCallback(
    (threadId: string) => {
      runtime.threads.switchToThread(threadId);
      router.push(`/thread/${threadId}`);
    },
    [router, runtime],
  );

  return (
    <ThreadListScreen
      threadIds={threadList.threadIds as string[]}
      isLoading={threadList.isLoading}
      onThreadPress={handleThreadPress}
    />
  );
}
