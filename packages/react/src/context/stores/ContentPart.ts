import type {
  ContentPartStatus,
  ImageContentPart,
  TextContentPart,
  ToolCallContentPart,
  ToolCallContentPartStatus,
  UIContentPart,
} from "../../types/AssistantTypes";

export type TextContentPartState = Readonly<{
  status: ContentPartStatus;
  part: TextContentPart;
}>;

export type ImageContentPartState = Readonly<{
  status: ContentPartStatus;
  part: ImageContentPart;
}>;

export type UIContentPartState = Readonly<{
  status: ContentPartStatus;
  part: UIContentPart;
}>;

export type ToolCallContentPartState = Readonly<{
  status: ToolCallContentPartStatus;
  part: ToolCallContentPart;
}>;

export type ContentPartState = Readonly<{
  status: ContentPartStatus | ToolCallContentPartStatus;
  part:
    | TextContentPart
    | ImageContentPart
    | UIContentPart
    | ToolCallContentPart;
}>;
