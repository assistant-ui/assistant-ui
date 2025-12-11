import { useCallback } from "react";
import { useRouter } from "expo-router";
import { ThreadListScreen } from "@/components/thread-list/ThreadListScreen";
import { useThreads } from "@/contexts/ThreadsContext";

export default function ThreadListPage() {
  const router = useRouter();
  const { threads, isLoading, deleteThread, createThread } = useThreads();

  const handleThreadPress = useCallback(
    (threadId: string) => {
      router.push(`/thread/${threadId}`);
    },
    [router],
  );

  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      await deleteThread(threadId);
    },
    [deleteThread],
  );

  return (
    <ThreadListScreen
      threads={threads}
      isLoading={isLoading}
      onThreadPress={handleThreadPress}
      onDeleteThread={handleDeleteThread}
    />
  );
}
