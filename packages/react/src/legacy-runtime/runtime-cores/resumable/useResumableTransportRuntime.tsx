"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAssistantTransportRuntime } from "../assistant-transport/useAssistantTransportRuntime";
import type { AssistantTransportOptions } from "../assistant-transport/types";
import {
  createResumableStateStorage,
  type ResumableStateStorage,
} from "./resumable-state";
import type { AssistantRuntime } from "../../runtime/AssistantRuntime";

export type ResumableState<TMessage = unknown> = {
  streamId: string;
  messages: TMessage[];
} | null;

export interface ResumableTransportRuntimeOptions<T>
  extends Omit<AssistantTransportOptions<T>, "resumeApi"> {
  resumeApi?: string | ((streamId: string) => string);
  storage?: ResumableStateStorage;
  onResumingChange?: (isResuming: boolean) => void;
}

export function unstable_useResumableTransportRuntime<T>(
  options: ResumableTransportRuntimeOptions<T>,
): {
  runtime: AssistantRuntime;
  resumeState: ResumableState;
  isReady: boolean;
  clearResumeState: () => void;
} {
  const {
    resumeApi: resumeApiOption = (streamId: string) =>
      `/api/chat/resume/${streamId}`,
    storage: customStorage,
    onResumingChange,
    ...transportOptions
  } = options;

  const storage = useMemo(
    () => customStorage ?? createResumableStateStorage(),
    [customStorage],
  );

  const [resumeState, setResumeState] = useState<ResumableState>(null);
  const [isReady, setIsReady] = useState(false);
  const resumeStateRef = useRef<ResumableState>(null);
  const onResumingChangeRef = useRef(onResumingChange);
  onResumingChangeRef.current = onResumingChange;

  useEffect(() => {
    const pendingStreamId = storage.getStreamId();
    const storedMessages = storage.getMessages();

    if (pendingStreamId && storedMessages && storedMessages.length > 0) {
      const state: ResumableState = {
        streamId: pendingStreamId,
        messages: storedMessages,
      };
      resumeStateRef.current = state;
      setResumeState(state);
      onResumingChangeRef.current?.(true);
    } else {
      storage.clearAll();
    }

    setIsReady(true);
  }, [storage]);

  const computedResumeApi = useMemo(() => {
    const currentState = resumeStateRef.current;
    if (!currentState) return undefined;

    return typeof resumeApiOption === "function"
      ? resumeApiOption(currentState.streamId)
      : resumeApiOption;
  }, [resumeApiOption, resumeState]);

  const handleResumeComplete = useCallback(() => {
    resumeStateRef.current = null;
    setResumeState(null);
    storage.clearAll();
    onResumingChangeRef.current?.(false);
  }, [storage]);

  const runtime = useAssistantTransportRuntime({
    ...transportOptions,
    ...(computedResumeApi && { resumeApi: computedResumeApi }),
    onFinish: () => {
      if (resumeStateRef.current) {
        handleResumeComplete();
      }
      transportOptions.onFinish?.();
    },
  });

  const clearResumeState = useCallback(() => {
    resumeStateRef.current = null;
    setResumeState(null);
    storage.clearAll();
  }, [storage]);

  return {
    runtime,
    resumeState,
    isReady,
    clearResumeState,
  };
}
