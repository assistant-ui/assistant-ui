"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import type { OpenUIArgs } from "@/lib/openui-tools";
import {
  BuiltinActionType,
  Renderer,
  type ActionEvent,
  type OpenUIError,
} from "@openuidev/react-lang";
import { openuiChatLibrary } from "@openuidev/react-ui";
import { useRef, useState } from "react";

type OpenUIActionResult = {
  type: string;
  message: string;
  params: Record<string, unknown>;
  formState?: Record<string, unknown>;
  formName?: string;
};

type OpenUIContentProps = {
  response: string;
  isStreaming: boolean;
  initialState?: Record<string, unknown>;
  onAction?: (event: ActionEvent) => void;
};

function OpenUIContent({
  response,
  isStreaming,
  initialState,
  onAction,
}: OpenUIContentProps) {
  const [errors, setErrors] = useState<OpenUIError[]>([]);

  return (
    <div className="w-full max-w-2xl">
      <Renderer
        response={response}
        library={openuiChatLibrary}
        isStreaming={isStreaming}
        onError={setErrors}
        {...(initialState !== undefined && { initialState })}
        {...(onAction !== undefined && { onAction })}
      />
      {!isStreaming && errors.length > 0 && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive mt-2 rounded-lg border p-3 text-sm"
        >
          OpenUI could not render this response.
        </div>
      )}
    </div>
  );
}

export const OpenUIPresent: ToolCallMessagePartComponent<
  OpenUIArgs,
  { displayed: true }
> = ({ args, status }) => (
  <OpenUIContent
    response={args.ui ?? ""}
    isStreaming={status.type === "running"}
  />
);

export const OpenUIPrompt: ToolCallMessagePartComponent<
  OpenUIArgs,
  OpenUIActionResult
> = ({ args, status, result, addResult }) => {
  const completed = useRef(result !== undefined);
  const onAction = (event: ActionEvent) => {
    if (
      result !== undefined ||
      completed.current ||
      event.type !== BuiltinActionType.ContinueConversation
    ) {
      return;
    }

    completed.current = true;
    try {
      addResult({
        type: event.type,
        message: event.humanFriendlyMessage,
        params: event.params,
        ...(event.formState !== undefined && { formState: event.formState }),
        ...(event.formName !== undefined && { formName: event.formName }),
      });
    } catch (error) {
      completed.current = false;
      throw error;
    }
  };

  return (
    <OpenUIContent
      response={args.ui ?? ""}
      isStreaming={status.type === "running"}
      onAction={onAction}
      {...(result?.formState !== undefined && {
        initialState: result.formState,
      })}
    />
  );
};
