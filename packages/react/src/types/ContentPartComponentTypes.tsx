import type { ComponentType } from "react";
import type {
  ContentPartStatus,
  FileContentPart,
  ImageContentPart,
  TextContentPart,
  ToolCallContentPart,
  UIContentPart,
  Unstable_AudioContentPart,
} from "./AssistantTypes";
import { ContentPartState } from "../api/ContentPartRuntime";
import { ReadonlyJSONObject } from "../utils/json/json-value";

export type EmptyContentPartProps = {
  status: ContentPartStatus;
};
export type EmptyContentPartComponent = ComponentType<EmptyContentPartProps>;

export type TextContentPartProps = ContentPartState & TextContentPart;
export type TextContentPartComponent = ComponentType<TextContentPartProps>;

export type ImageContentPartProps = ContentPartState & ImageContentPart;
export type ImageContentPartComponent = ComponentType<ImageContentPartProps>;

export type FileContentPartProps = ContentPartState & FileContentPart;
export type FileContentPartComponent = ComponentType<FileContentPartProps>;

export type Unstable_AudioContentPartProps = ContentPartState &
  Unstable_AudioContentPart;
export type Unstable_AudioContentPartComponent =
  ComponentType<Unstable_AudioContentPartProps>;

export type UIContentPartProps = ContentPartState & UIContentPart;
export type UIContentPartComponent = ComponentType<UIContentPartProps>;

export type ToolCallContentPartProps<
  TArgs extends ReadonlyJSONObject = any,
  TResult = unknown,
> = ContentPartState &
  ToolCallContentPart<TArgs, TResult> & {
    addResult: (result: any) => void;
  };

export type ToolCallContentPartComponent<
  TArgs extends ReadonlyJSONObject = any,
  TResult = any,
> = ComponentType<ToolCallContentPartProps<TArgs, TResult>>;
