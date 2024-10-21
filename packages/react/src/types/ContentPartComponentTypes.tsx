"use client";
import type { ComponentType } from "react";
import type {
  ContentPartStatus,
  ImageContentPart,
  TextContentPart,
  ToolCallContentPart,
  UIContentPart,
  Unstable_AudioContentPart,
} from "./AssistantTypes";
import { ContentPartState } from "../api/ContentPartRuntime";

export type EmptyContentPartProps = {
  status: ContentPartStatus;
};
export type EmptyContentPartComponent = ComponentType<EmptyContentPartProps>;

export type TextContentPartProps = ContentPartState &
  TextContentPart & {
    /**
     * @deprecated You can directly access content part fields in the state. Replace `.part.type` with `.type` etc. This will be removed in 0.6.0.
     */
    part: TextContentPart;
  };
export type TextContentPartComponent = ComponentType<TextContentPartProps>;

export type ImageContentPartProps = ContentPartState &
  ImageContentPart & {
    /**
     * @deprecated You can directly access content part fields in the state. Replace `.part.type` with `.type` etc. This will be removed in 0.6.0.
     */
    part: ImageContentPart;
  };
export type ImageContentPartComponent = ComponentType<ImageContentPartProps>;

export type Unstable_AudioContentPartProps = ContentPartState &
  Unstable_AudioContentPart & {
    /**
     * @deprecated You can directly access content part fields in the state. Replace `.part.type` with `.type` etc. This will be removed in 0.6.0.
     */
    part: Unstable_AudioContentPart;
  };
export type Unstable_AudioContentPartComponent =
  ComponentType<Unstable_AudioContentPartProps>;

export type UIContentPartProps = ContentPartState &
  UIContentPart & {
    /**
     * @deprecated You can directly access content part fields in the state. Replace `.part.type` with `.type` etc. This will be removed in 0.6.0.
     */
    part: UIContentPart;
  };
export type UIContentPartComponent = ComponentType<UIContentPartProps>;

export type ToolCallContentPartProps<
  TArgs extends Record<string, unknown> = any,
  TResult = unknown,
> = ContentPartState &
  ToolCallContentPart<TArgs, TResult> & {
    /**
     * @deprecated You can directly access content part fields in the state. Replace `.part.type` with `.type` etc. This will be removed in 0.6.0.
     */
    part: ToolCallContentPart<TArgs, TResult>;
    addResult: (result: any) => void;
  };

export type ToolCallContentPartComponent<
  TArgs extends Record<string, unknown> = any,
  TResult = any,
> = ComponentType<ToolCallContentPartProps<TArgs, TResult>>;
