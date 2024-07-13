"use client";
import type { ComponentType } from "react";
import type {
  ImageContentPart,
  MessageStatus,
  TextContentPart,
  ToolCallContentPart,
  UIContentPart,
} from "./AssistantTypes";

export type TextContentPartProps = {
  part: TextContentPart;
  status: MessageStatus;
};
export type TextContentPartComponent = ComponentType<TextContentPartProps>;

export type ImageContentPartProps = {
  part: ImageContentPart;
  status: MessageStatus;
};
export type ImageContentPartComponent = ComponentType<ImageContentPartProps>;

export type UIContentPartProps = {
  part: UIContentPart;
  status: MessageStatus;
};
export type UIContentPartComponent = ComponentType<UIContentPartProps>;

export type ToolCallContentPartProps<
  TArgs extends Record<string | number, unknown> = any,
  TResult = unknown,
> = {
  part: ToolCallContentPart<TArgs, TResult>;
  status: MessageStatus;
  addResult: (result: any) => void;
};

export type ToolCallContentPartComponent<
  TArgs extends Record<string | number, unknown> = any,
  TResult = any,
> = ComponentType<ToolCallContentPartProps<TArgs, TResult>>;
