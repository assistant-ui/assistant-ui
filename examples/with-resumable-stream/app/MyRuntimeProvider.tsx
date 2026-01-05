"use client";

import { AssistantRuntimeProvider, useAssistantApi } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import type { UIMessage } from "ai";
import { useState, useMemo, useEffect, useRef, type ReactNode } from "react";
import {
  getPendingStreamId,
  setPendingStreamId,
  storeUserMessages,
  getStoredUserMessages,
  clearAllResumableState,
} from "@/lib/resumable-transport";

type ResumeState = {
  streamId: string;
  userMessages: UIMessage[];
} | null;

function extractUserText(messages: UIMessage[]): string {
  const lastUserMessage = messages[messages.length - 1];
  if (!lastUserMessage) return "";

  return (
    lastUserMessage.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? ""
  );
}

function ResumeInitializer({ resumeState }: { resumeState: ResumeState }) {
  const api = useAssistantApi();
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (!resumeState || triggeredRef.current) return;
    triggeredRef.current = true;

    const userText = extractUserText(resumeState.userMessages);

    api.thread().append({
      role: "user",
      content: [{ type: "text", text: userText }],
    });
  }, [resumeState, api]);

  return null;
}

export function MyRuntimeProvider({
  children,
  onResuming,
}: {
  children: ReactNode;
  onResuming?: (isResuming: boolean) => void;
}) {
  const resumeStateRef = useRef<ResumeState>(null);
  const [resumeState, setResumeState] = useState<ResumeState>(null);
  const [isReady, setIsReady] = useState(false);
  const onResumingRef = useRef(onResuming);
  onResumingRef.current = onResuming;

  useEffect(() => {
    const pendingStreamId = getPendingStreamId();
    const storedMessages = getStoredUserMessages();

    if (pendingStreamId && storedMessages && storedMessages.length > 0) {
      const state = {
        streamId: pendingStreamId,
        userMessages: storedMessages,
      };
      resumeStateRef.current = state;
      setResumeState(state);
      onResumingRef.current?.(true);
    } else {
      clearAllResumableState();
    }

    setIsReady(true);
  }, []);

  const transport = useMemo(() => {
    return new AssistantChatTransport({
      api: "/api/chat",
      fetch: async (url, options) => {
        const currentResumeState = resumeStateRef.current;

        if (currentResumeState) {
          const resumeUrl = `/api/chat/resume/${currentResumeState.streamId}`;
          const response = await fetch(resumeUrl);

          if (!response.ok) {
            throw new Error(`Resume failed: ${response.status}`);
          }

          resumeStateRef.current = null;
          onResumingRef.current?.(false);

          const originalBody = response.body;
          if (originalBody) {
            const transformStream = new TransformStream<Uint8Array, Uint8Array>(
              {
                transform(chunk, controller) {
                  controller.enqueue(chunk);
                },
                flush() {
                  clearAllResumableState();
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
          if (options?.body) {
            const body = JSON.parse(options.body as string);
            if (body.messages) {
              storeUserMessages(body.messages);
            }
          }
        } catch {
          // noop
        }

        const response = await fetch(url, options);

        const streamId = response.headers.get("X-Stream-Id");
        if (streamId) {
          setPendingStreamId(streamId);
        }

        const originalBody = response.body;
        if (originalBody) {
          const transformStream = new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
              controller.enqueue(chunk);
            },
            flush() {
              clearAllResumableState();
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
  }, []);

  const runtime = useChatRuntime({
    transport,
  });

  if (!isReady) {
    return null;
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {resumeState && <ResumeInitializer resumeState={resumeState} />}
      {children}
    </AssistantRuntimeProvider>
  );
}
