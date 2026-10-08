"use client";

import { useMemo } from "react";
import { useAuiState } from "@assistant-ui/react";
import { useThreadListGroups } from "@/components/assistant-ui/elements/thread-list.aui";

export function useDemoThreadListGroups(search = "") {
  const { threadIds, filteredIndices, groups } = useThreadListGroups(search);
  const threadItems = useAuiState((s) => s.threads.threadItems);

  return useMemo(() => {
    const pinnedSet = new Set(
      threadItems
        .filter((item) => item.custom?.pinned === "true")
        .map((item) => item.id),
    );
    const isPinned = (index: number) => pinnedSet.has(threadIds[index]!);
    const pinned = (
      groups ? groups.flatMap((group) => group.indices) : filteredIndices
    ).filter(isPinned);
    const sections = (
      groups ?? [{ label: "Threads", indices: filteredIndices }]
    )
      .map((group) => ({
        label: group.label,
        indices: group.indices.filter((index) => !isPinned(index)),
      }))
      .filter((group) => group.indices.length > 0);
    return {
      threadIds,
      filteredIndices,
      pinned,
      sections,
      orderedThreadIds: [
        ...pinned,
        ...sections.flatMap((section) => section.indices),
      ].map((index) => threadIds[index]!),
    };
  }, [filteredIndices, groups, threadIds, threadItems]);
}
