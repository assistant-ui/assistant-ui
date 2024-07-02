import type {
  ImageContentPart,
  TextContentPart,
  ToolCallContentPart,
  UIContentPart,
} from "../../types/AssistantTypes";

export type TextContentPartState = Readonly<{
  status: "in_progress" | "done" | "error";
  part: TextContentPart;
}>;

export type ImageContentPartState = Readonly<{
  status: "in_progress" | "done" | "error";
  part: ImageContentPart;
}>;

export type UIContentPartState = Readonly<{
  status: "in_progress" | "done" | "error";
  part: UIContentPart;
}>;

export type ToolCallContentPartState = Readonly<{
  status: "in_progress" | "done" | "error";
  part: ToolCallContentPart;
}>;

export type ContentPartState = Readonly<{
  status: "in_progress" | "done" | "error";
  part:
    | TextContentPart
    | ImageContentPart
    | UIContentPart
    | ToolCallContentPart;
}>;
