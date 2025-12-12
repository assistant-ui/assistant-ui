import { useCallback, useSyncExternalStore } from "react";
import { useRouter } from "expo-router";
import { ThreadListScreen } from "@/components/thread-list/ThreadListScreen";
import { useRuntime } from "@/contexts/RuntimeContext";

export default function ThreadListPage() {
  const router = useRouter();
  const runtime = useRuntime();

  // Subscribe to thread list state
  const threadListState = useSyncExternalStore(
    (callback) => runtime.threadList.subscribe(callback),
    () => runtime.threadList.getState(),
    () => runtime.threadList.getState(),
  );

  const handleThreadPress = useCallback(
    (threadId: string) => {
      runtime.switchToThread(threadId);
      router.push(`/thread/${threadId}`);
    },
    [router, runtime],
  );

  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      await runtime.threadList.deleteThread(threadId);
    },
    [runtime],
  );

  // Convert ThreadListItemState to ThreadMetadata format for compatibility
  const threads = threadListState.threads.map((t) => ({
    id: t.id,
    title: t.title,
    createdAt: t.createdAt,
    lastMessageAt: t.lastMessageAt,
  }));

  return (
    <ThreadListScreen
      threads={threads}
      isLoading={threadListState.isLoading}
      onThreadPress={handleThreadPress}
      onDeleteThread={handleDeleteThread}
    />
  );
}
