"use client";
import type { ComponentType } from "react";
import type {
  ImageContentPart,
  TextContentPart,
  ToolCallContentPart,
  UIContentPart,
} from "../../utils/AssistantTypes";

type ContentPartStatus = "done" | "in_progress" | "error";

export type TextContentPartProps = {
  part: TextContentPart;
  status: ContentPartStatus;
};
export type TextContentPartComponent = ComponentType<TextContentPartProps>;

export type ImageContentPartProps = {
  part: ImageContentPart;
  status: ContentPartStatus;
};
export type ImageContentPartComponent = ComponentType<ImageContentPartProps>;

export type UIContentPartProps = {
  part: UIContentPart;
  status: ContentPartStatus;
};
export type UIContentPartComponent = ComponentType<UIContentPartProps>;

export type ToolCallContentPartProps<TArgs = any, TResult = any> = {
  part: ToolCallContentPart<TArgs, TResult>;
  status: ContentPartStatus;
};

export type ToolCallContentPartComponent<
  TArgs = any,
  TResult = any,
> = ComponentType<ToolCallContentPartProps<TArgs, TResult>>;
