"use client";

import { useCallback, useState } from "react";
import type {
  MastraMemoryOperationOptions,
  MastraMemorySearchOptions,
  UseMastraMemoryOptions,
  UseMastraMemoryResult,
} from "./types";

const requireThreadId = (
  operation: string,
  configuredThreadId: string | undefined,
  overrideThreadId: string | undefined,
) => {
  const threadId = overrideThreadId ?? configuredThreadId;
  if (!threadId) {
    throw new Error(
      `useMastraMemory.${operation} requires a threadId in the hook options or operation options.`,
    );
  }
  return threadId;
};

/**
 * Accesses Mastra semantic search and working memory beside a Mastra-backed
 * assistant-ui runtime.
 */
export const useMastraMemory = ({
  client,
  agentId,
  resourceId,
  threadId,
  requestContext,
}: UseMastraMemoryOptions): UseMastraMemoryResult => {
  const [searchCount, setSearchCount] = useState(0);
  const [readCount, setReadCount] = useState(0);
  const [updateCount, setUpdateCount] = useState(0);

  const searchMemory = useCallback(
    async (searchQuery: string, options: MastraMemorySearchOptions = {}) => {
      setSearchCount((count) => count + 1);
      try {
        const selectedThreadId = options.threadId ?? threadId;
        return await client.searchMemory({
          agentId,
          resourceId: options.resourceId ?? resourceId,
          searchQuery,
          ...(selectedThreadId ? { threadId: selectedThreadId } : {}),
          ...(options.memoryConfig !== undefined
            ? { memoryConfig: options.memoryConfig }
            : {}),
          requestContext: options.requestContext ?? requestContext,
        });
      } finally {
        setSearchCount((count) => count - 1);
      }
    },
    [agentId, client, requestContext, resourceId, threadId],
  );

  const getWorkingMemory = useCallback(
    async (options: MastraMemoryOperationOptions = {}) => {
      const selectedThreadId = requireThreadId(
        "getWorkingMemory",
        threadId,
        options.threadId,
      );
      setReadCount((count) => count + 1);
      try {
        return await client.getWorkingMemory({
          agentId,
          threadId: selectedThreadId,
          resourceId: options.resourceId ?? resourceId,
          requestContext: options.requestContext ?? requestContext,
        });
      } finally {
        setReadCount((count) => count - 1);
      }
    },
    [agentId, client, requestContext, resourceId, threadId],
  );

  const updateWorkingMemory = useCallback(
    async (
      workingMemory: string,
      options: MastraMemoryOperationOptions = {},
    ) => {
      const selectedThreadId = requireThreadId(
        "updateWorkingMemory",
        threadId,
        options.threadId,
      );
      setUpdateCount((count) => count + 1);
      try {
        return await client.updateWorkingMemory({
          agentId,
          threadId: selectedThreadId,
          workingMemory,
          resourceId: options.resourceId ?? resourceId,
          requestContext: options.requestContext ?? requestContext,
        });
      } finally {
        setUpdateCount((count) => count - 1);
      }
    },
    [agentId, client, requestContext, resourceId, threadId],
  );

  return {
    isSearching: searchCount > 0,
    isReadingWorkingMemory: readCount > 0,
    isUpdatingWorkingMemory: updateCount > 0,
    searchMemory,
    getWorkingMemory,
    updateWorkingMemory,
  };
};
