import type { ParametersTableProps } from "@/components/docs/parameters-table";

const BaseComposerState: ParametersTableProps = {
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
      type: "(file: File | CreateAttachment) => Promise<void>",
      required: true,
      description:
        "A function to add an attachment to the composer. Accepts a File (processed through the AttachmentAdapter) or a CreateAttachment descriptor for external-source attachments.",
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
