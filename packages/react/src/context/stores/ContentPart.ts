import type {
  ContentPartStatus,
  ImageContentPart,
  TextContentPart,
  ToolCallContentPart,
  ToolContentPartStatus,
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
  status: ToolContentPartStatus;
  part: ToolCallContentPart;
}>;

export type ContentPartState = Readonly<{
  status: ToolContentPartStatus;
  part:
    | TextContentPart
    | ImageContentPart
    | UIContentPart
    | ToolCallContentPart;
}>;
