export type ThreadRuntimePath = {
  ref: string;
  threadSelector: { type: "main" };
};

export type MessageRuntimePath = ThreadRuntimePath & {
  messageSelector:
    | { type: "messageId"; messageId: string }
    | { type: "index"; index: number };
};

export type ContentPartRuntimePath = MessageRuntimePath & {
  contentPartSelector:
    | { type: "index"; index: number }
    | { type: "toolCallId"; toolCallId: string };
};

export type AttachmentRuntimePath = (
  | (MessageRuntimePath & {
      attachmentSource: "message" | "edit-composer";
    })
  | (ThreadRuntimePath & {
      attachmentSource: "thread-composer";
    })
) & {
  attachmentSelector:
    | {
        type: "index";
        index: number;
      }
    | {
        type: "index";
        index: number;
      }
    | {
        type: "index";
        index: number;
      };
};

export type ComposerRuntimePath =
  | (ThreadRuntimePath & {
      composerSource: "thread";
    })
  | (MessageRuntimePath & {
      composerSource: "edit";
    });
