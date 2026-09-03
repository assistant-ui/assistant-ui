import type { UseThreadsResult } from "../types";

export const automaticTitleGenerator = Symbol();

type ThreadsWithAutomaticTitleGenerator = UseThreadsResult & {
  [automaticTitleGenerator]?: (threadId: string) => Promise<string | null>;
};

export function generateAutomaticThreadTitle(
  threads: UseThreadsResult,
  threadId: string,
): Promise<string | null> {
  return (
    (threads as ThreadsWithAutomaticTitleGenerator)[automaticTitleGenerator]?.(
      threadId,
    ) ?? threads.generateTitle(threadId)
  );
}
