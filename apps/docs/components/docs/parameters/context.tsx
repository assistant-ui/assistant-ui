import { ParametersTableProps } from "../ParametersTable";

export const AssistantRuntimeState: ParametersTableProps = {
  type: "AssistantRuntime",
  parameters: [
    {
      name: "switchToNewThread",
      type: "() => void",
      description: "Switch to a new thread.",
      required: true,
    },
  ],
};

export const AssistantToolUIsState: ParametersTableProps = {
  type: "AssistantToolUIsState",
  parameters: [
    {
      name: "getToolUI",
      type: "(toolName: string) => ToolCallMessagePartProps",
      description: "Gets the current tool UI for a given tool name.",
      required: true,
      children: [
        {
          type: "ToolCallMessagePartProps<TArgs, TResult>",
          parameters: [
            {
              name: "part",
              type: "ToolCallMessagePart<TArgs, TResult>",
              description: "The tool call message part.",
            },
            {
              name: "status",
              type: "MessagePartStatus",
              description: "The tool call status.",
            },
            {
              name: "addResult",
              type: "(result: TResult | ToolResponse<TResult>) => void",
              description: "Adds a result to the tool call.",
            },
          ],
        },
      ],
    },
    {
      name: "setToolUI",
      type: "(toolName: string, render: ToolCallMessagePartComponent) => Unsubscribe",
      description: "Sets the tool UI.",
      required: true,
    },
  ],
};

export const ThreadState: ParametersTableProps = {
  type: "ThreadState",
  parameters: [
    {
      name: "isRunning",
      type: "boolean",
      required: true,
      description: "Whether the thread is running.",
    },
    {
      name: "isDisabled",
      type: "boolean",
      required: true,
      description: "Whether the thread is disabled.",
    },
  ],
};

export const ThreadMessagesState: ParametersTableProps = {
  type: "ThreadMessagesState",
  parameters: [
    {
      name: "messages",
      type: "readonly ThreadMessage[]",
      required: true,
      description: "The messages in the thread.",
    },
  ],
};

export const ThreadRuntimeState: ParametersTableProps = {
  type: "ThreadRuntime",
  parameters: [
    {
      name: "getBranches",
      type: "(messageId: string) => readonly string[]",
      required: true,
      description: "A function to get the branches for a message.",
    },
    {
      name: "switchToBranch",
      type: "(branchId: string) => void",
      required: true,
      description: "A function to switch to a branch.",
    },
    {
      name: "append",
      type: "(message: AppendMessage) => void",
      required: true,
      description: "A function to append a message to the thread.",
    },
    {
      name: "startRun",
      type: "(parentId: string | null) => void",
      required: true,
      description: "A function to start a run.",
    },
    {
      name: "cancelRun",
      type: "() => void",
      required: true,
      description: "A function to cancel a run.",
    },
    {
      name: "addToolResult",
      type: "(options: AddToolResultOptions) => void",
      required: true,
      description: "A function to add a tool result.",
    },
  ],
};

export const BaseComposerState: ParametersTableProps = {
  type: "BaseComposerState",
  parameters: [
    {
      name: "text",
      type: "string",
      required: true,
      description: "The current text of the composer.",
    },
    {
      name: "setText",
      type: "(text: string) => void",
      required: true,
      description: "A function to set the text of the composer.",
    },
    {
      name: "attachments",
      type: "readonly Attachment[]",
      required: true,
      description: "The current attachments of the composer.",
    },
    {
      name: "addAttachment",
      type: "(attachment: Attachment) => void",
      required: true,
      description: "A function to add an attachment to the composer.",
    },
    {
      name: "removeAttachment",
      type: "(attachmentId: string) => void",
      required: true,
      description: "A function to remove an attachment from the composer.",
    },
    {
      name: "reset",
      type: "() => void",
      required: true,
      description: "A function to reset the composer.",
    },
  ],
};

export const ComposerState: ParametersTableProps = {
  type: "ComposerState",
  parameters: [
    ...BaseComposerState.parameters,
    {
      name: "canCancel",
      type: "true",
      required: true,
      description: "Whether the composer can be canceled.",
    },
    {
      name: "isEditing",
      type: "true",
      required: true,
      description: "Whether the composer is in edit mode.",
    },
    {
      name: "send",
      type: "() => void",
      required: true,
      description: "A function to send the message.",
    },
    {
      name: "cancel",
      type: "() => void",
      required: true,
      description: "A function to cancel the run.",
    },
    {
      name: "focus",
      type: "() => void",
      required: true,
      description: "A function to focus the composer.",
    },
    {
      name: "onFocus",
      type: "(listener: () => void) => Unsubscribe",
      required: true,
      description: "A function to subscribe to focus events.",
    },
  ],
};

export const EditComposerState: ParametersTableProps = {
  type: "EditComposerState",
  parameters: [
    ...BaseComposerState.parameters,
    {
      name: "canCancel",
      type: "boolean",
      required: true,
      description: "Whether the composer can be canceled.",
    },
    {
      name: "isEditing",
      type: "boolean",
      required: true,
      description: "Whether the composer is in edit mode.",
    },
    {
      name: "edit",
      type: "() => void",
      required: true,
      description: "A function to enter edit mode.",
    },
    {
      name: "send",
      type: "() => void",
      required: true,
      description: "A function to send the message.",
    },
    {
      name: "cancel",
      type: "() => void",
      required: true,
      description: "A function to exit the edit mode.",
    },
  ],
};

export const ThreadViewportState: ParametersTableProps = {
  type: "ThreadViewportState",
  parameters: [
    {
      name: "isAtBottom",
      type: "boolean",
      required: true,
      description: "Whether the thread is at the bottom.",
    },
    {
      name: "scrollToBottom",
      type: "() => void",
      required: true,
      description: "A function to scroll to the bottom.",
    },
    {
      name: "onScrollToBottom",
      type: "(callback: () => void) => Unsubscribe",
      required: true,
      description: "A function to subscribe to scroll to bottom events.",
    },
  ],
};

export const MessagePartState: ParametersTableProps = {
  type: "MessagePartState",
  parameters: [
    {
      name: "part",
      type: "Readonly<MessagePartState>",
      required: true,
      description: "The current message part.",
    },
    {
      name: "status",
      type: "MessageStatus",
      required: true,
      description: "The current message part status.",
      children: [
        {
          type: "MessageStatus",
          parameters: [
            {
              name: "type",
              type: "'running' | 'requires-action' | 'complete' | 'incomplete'",
              required: true,
              description: "The status.",
            },
            {
              name: "finish-reason",
              type: "'stop' | 'cancelled' | 'length' | 'content-filter' | 'tool-calls' | 'other' | 'unknown'",
              required: false,
              description: "The finish reason if the status is 'incomplete'.",
            },
            {
              name: "error",
              type: "unknown",
              required: false,
              description: "The error object if the status is 'error'.",
            },
          ],
        },
      ],
    },
  ],
};

export const MessageState: ParametersTableProps = {
  type: "MessageState",
  parameters: [
    {
      name: "message",
      type: "Readonly<ThreadMessage>",
      required: true,
      description: "The current message.",
    },
    {
      name: "parentId",
      type: "string | null",
      required: true,
      description: "The parent message id.",
    },
    {
      name: "branches",
      type: "readonly string[]",
      required: true,
      description: "The branches for the message.",
    },
    {
      name: "isLast",
      type: "boolean",
      required: true,
      description: "Whether the message is the last in the thread.",
    },
  ],
};

export const MessageUtilsState: ParametersTableProps = {
  type: "MessageUtilsState",
  parameters: [
    {
      name: "isCopied",
      type: "boolean",
      required: true,
      description: "Whether the message is copied.",
    },
    {
      name: "setIsCopied",
      type: "(value: boolean) => void",
      required: true,
      description: "A function to set the is copied.",
    },
    {
      name: "isHovering",
      type: "boolean",
      required: true,
      description: "Whether the message is being hovered.",
    },
    {
      name: "setIsHovering",
      type: "(value: boolean) => void",
      required: true,
      description: "A function to set the is hovering.",
    },
    {
      name: "isSpeaking",
      type: "boolean",
      required: true,
      description: "Whether the message is currently being spoken.",
    },
    {
      name: "stopSpeaking",
      type: "() => void",
      required: true,
      description: "A function to stop the message from being spoken.",
    },
    {
      name: "addUtterance",
      type: "(utterance: SpeechSynthesisAdapter.Utterance) => void",
      required: true,
      description: "A function to add a speech utterance.",
    },
  ],
};

export const ComposerAttachmentState: ParametersTableProps = {
  type: "ComposerAttachmentState",
  parameters: [
    {
      name: "attachment",
      type: "ComposerAttachment",
      required: true,
      description: "The current composer attachment.",
    },
  ],
};

export const MessageAttachmentState: ParametersTableProps = {
  type: "MessageAttachmentState",
  parameters: [
    {
      name: "attachment",
      type: "MessageAttachment",
      required: true,
      description: "The current message attachment.",
    },
  ],
};
