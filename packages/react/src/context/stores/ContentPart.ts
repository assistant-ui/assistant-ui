import type {
  ImageContentPart,
  MessageStatus,
  TextContentPart,
  ToolCallContentPart,
  UIContentPart,
} from "../../types/AssistantTypes";

export type TextContentPartState = Readonly<{
  status: MessageStatus;
  part: TextContentPart;
}>;

export type ImageContentPartState = Readonly<{
  status: MessageStatus;
  part: ImageContentPart;
}>;

export type UIContentPartState = Readonly<{
  status: MessageStatus;
  part: UIContentPart;
}>;

export type ToolCallContentPartState = Readonly<{
  status: MessageStatus;
  part: ToolCallContentPart;
}>;

export type ContentPartState = Readonly<{
  status: MessageStatus;
  part:
    | TextContentPart
    | ImageContentPart
    | UIContentPart
    | ToolCallContentPart;
}>;
