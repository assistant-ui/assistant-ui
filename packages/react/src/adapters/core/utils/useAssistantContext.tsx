"use client";
import {
  type MutableRefObject,
  useEffect,
  useInsertionEffect,
  useRef,
  useState,
} from "react";
import { create } from "zustand";
import type {
  AssistantStore,
  ThreadMessage,
  ThreadState,
} from "../../../utils/context/stores/AssistantTypes";
import { makeThreadComposerStore } from "../../../utils/context/stores/ComposerStore";
import { makeViewportStore } from "../../../utils/context/stores/ViewportStore";
import type { ThreadRuntime } from "../ThreadRuntime";
import { AssistantMessageRepository } from "./AssistantMessageRepository";

const makeThreadStore = (runtimeRef: MutableRefObject<ThreadRuntime>) => {
  const repository = new AssistantMessageRepository((messages) => {
    useThread.setState({ messages });
  });

  const useThread = create<ThreadState>(() => ({
    messages: [],
    isRunning: false,
    getBranches: (messageId) => repository.getBranches(messageId),
    switchToBranch: (branchId) => {
      repository.withModifications((repository) => {
        repository.switchToBranch(branchId);
      });
    },
    startRun: async (parentId) => {
      const optimisticId = repository.withModifications((repository) => {
        const optimisticId = repository.appendOptimisticMessage(parentId, {
          role: "assistant",
          content: [{ type: "text", text: "" }],
        });
        repository.resetHead(optimisticId);
        return optimisticId;
      });
      const { id } = await runtimeRef.current.startRun(parentId);
      repository.withModifications((repository) => {
        repository.deleteMessage(optimisticId, id);
      });
    },
    append: async (message) => {
      const [parentOptimisticId, optimisticId] = repository.withModifications(
        (repository) => {
          const parentOptimisticId = repository.appendOptimisticMessage(
            message.parentId,
            {
              role: "user",
              content: message.content,
            },
          );
          const optimisticId = repository.appendOptimisticMessage(
            parentOptimisticId,
            {
              role: "assistant",
              content: [{ type: "text", text: "" }],
            },
          );
          repository.resetHead(optimisticId);
          return [parentOptimisticId, optimisticId] as const;
        },
      );
      const { parentId, id } = await runtimeRef.current.append(message);
      repository.withModifications((repository) => {
        repository.deleteMessage(parentOptimisticId, parentId);
        repository.deleteMessage(optimisticId, id);
      });
    },
    cancelRun: () => runtimeRef.current.cancelRun(),
  }));

  const onNewMessage = (parentId: string | null, message: ThreadMessage) => {
    repository.withModifications((repository) => {
      repository.addOrUpdateMessage(parentId, message);
    });
  };

  const onRunningChange = (isRunning: boolean) => {
    useThread.setState({ isRunning });
  };

  return {
    useThread,
    onNewMessage,
    onRunningChange,
  };
};

export const useAssistantContext = (runtime: ThreadRuntime) => {
  const runtimeRef = useRef(runtime);

  useInsertionEffect(() => {
    runtimeRef.current = runtime;
  });

  const [{ context, onNewMessage, onRunningChange }] = useState(() => {
    const { useThread, onNewMessage, onRunningChange } =
      makeThreadStore(runtimeRef);
    const useViewport = makeViewportStore();
    const useComposer = makeThreadComposerStore(useThread);

    return {
      context: { useViewport, useThread, useComposer } satisfies AssistantStore,
      onNewMessage,
      onRunningChange,
    };
  });

  useEffect(() => {
    return runtime.subscribeToMessageUpdates(onNewMessage);
  }, [runtime, onNewMessage]);

  useEffect(() => {
    return runtime.subscribeToStatusUpdates(onRunningChange);
  }, [runtime, onRunningChange]);

  return context;
};
