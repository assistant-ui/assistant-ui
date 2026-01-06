"use client";

import type { UIMessage } from "ai";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  useChatRuntime,
  type UseChatRuntimeOptions,
} from "../use-chat/useChatRuntime";
import { AssistantChatTransport } from "../use-chat/AssistantChatTransport";
import {
  unstable_getPendingStreamId,
  unstable_setPendingStreamId,
  unstable_storeUserMessages,
  unstable_getStoredUserMessages,
  unstable_clearAllResumableState,
} from "./resumable-state";

export type ResumeState<UI_MESSAGE extends UIMessage = UIMessage> = {
  streamId: string;
  userMessages: UI_MESSAGE[];
} | null;

export interface ResumableRuntimeOptions<
  UI_MESSAGE extends UIMessage = UIMessage,
> extends Omit<UseChatRuntimeOptions<UI_MESSAGE>, "transport"> {
  api?: string;
  resumeApi?: string | ((streamId: string) => string);
  onResumingChange?: ((isResuming: boolean) => void) | undefined;
}

export function unstable_useResumableRuntime<
  UI_MESSAGE extends UIMessage = UIMessage,
>(options?: ResumableRuntimeOptions<UI_MESSAGE>) {
  const {
    api = "/api/chat",
    resumeApi = (streamId: string) => `/api/chat/resume/${streamId}`,
    onResumingChange,
    ...chatOptions
  } = options ?? {};

  const resumeStateRef = useRef<ResumeState<UI_MESSAGE>>(null);
  const [resumeState, setResumeState] = useState<ResumeState<UI_MESSAGE>>(null);
  const [isReady, setIsReady] = useState(false);
  const onResumingChangeRef = useRef(onResumingChange);
  onResumingChangeRef.current = onResumingChange;

  useEffect(() => {
    const pendingStreamId = unstable_getPendingStreamId();
    const storedMessages = unstable_getStoredUserMessages() as
      | UI_MESSAGE[]
      | null;

    if (pendingStreamId && storedMessages && storedMessages.length > 0) {
      const state: ResumeState<UI_MESSAGE> = {
        streamId: pendingStreamId,
        userMessages: storedMessages,
      };
      resumeStateRef.current = state;
      setResumeState(state);
      onResumingChangeRef.current?.(true);
    } else {
      unstable_clearAllResumableState();
    }

    setIsReady(true);
  }, []);

  const transport = useMemo(() => {
    return new AssistantChatTransport<UI_MESSAGE>({
      api,
      fetch: async (url, fetchOptions) => {
        const currentResumeState = resumeStateRef.current;

        if (currentResumeState) {
          const resumeUrl =
            typeof resumeApi === "function"
              ? resumeApi(currentResumeState.streamId)
              : `${resumeApi}/${currentResumeState.streamId}`;

          const response = await fetch(resumeUrl);

          if (!response.ok) {
            throw new Error(`Resume failed: ${response.status}`);
          }

          resumeStateRef.current = null;
          onResumingChangeRef.current?.(false);

          const originalBody = response.body;
          if (originalBody) {
            const transformStream = new TransformStream<Uint8Array, Uint8Array>(
              {
                transform(chunk, controller) {
                  controller.enqueue(chunk);
                },
                flush() {
                  unstable_clearAllResumableState();
                },
              },
            );

            return new Response(originalBody.pipeThrough(transformStream), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          }

          return response;
        }

        try {
          if (fetchOptions?.body) {
            const body = JSON.parse(fetchOptions.body as string);
            if (body.messages) {
              unstable_storeUserMessages(body.messages);
            }
          }
        } catch {
          // noop
        }

        const response = await fetch(url, fetchOptions);

        const streamId = response.headers.get("X-Stream-Id");
        if (streamId) {
          unstable_setPendingStreamId(streamId);
        }

        const originalBody = response.body;
        if (originalBody) {
          const transformStream = new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
              controller.enqueue(chunk);
            },
            flush() {
              unstable_clearAllResumableState();
            },
          });

          return new Response(originalBody.pipeThrough(transformStream), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }

        return response;
      },
      body: () => {
        const currentResumeState = resumeStateRef.current;
        if (currentResumeState) {
          return {
            resumeMessages: currentResumeState.userMessages,
          };
        }
        return {};
      },
    });
  }, [api, resumeApi]);

  const runtime = useChatRuntime({
    ...chatOptions,
    transport,
  });

  return {
    runtime,
    resumeState,
    isReady,
  };
}
