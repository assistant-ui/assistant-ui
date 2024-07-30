"use client";
import type { ComponentType } from "react";
import type {
  ContentPartStatus,
  ImageContentPart,
  TextContentPart,
  ToolCallContentPart,
  ToolCallContentPartStatus,
  UIContentPart,
} from "./AssistantTypes";

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

export type ToolCallContentPartProps<
  TArgs extends Record<string, unknown> = any,
  TResult = unknown,
> = {
  part: ToolCallContentPart<TArgs, TResult>;
  status: ToolCallContentPartStatus;
  addResult: (result: any) => void;
};

export type ToolCallContentPartComponent<
  TArgs extends Record<string, unknown> = any,
  TResult = any,
> = ComponentType<ToolCallContentPartProps<TArgs, TResult>>;
