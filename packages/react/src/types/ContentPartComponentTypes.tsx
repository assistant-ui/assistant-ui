import type { ComponentType } from "react";
import type {
  ContentPartStatus,
  FileContentPart,
  ImageContentPart,
  ReasoningContentPart,
  TextContentPart,
  ToolCallContentPart,
  Unstable_AudioContentPart,
} from "./AssistantTypes";
import { ContentPartState } from "../api/ContentPartRuntime";

export type EmptyContentPartProps = {
  status: ContentPartStatus;
};
export type EmptyContentPartComponent = ComponentType<EmptyContentPartProps>;

export type TextContentPartProps = ContentPartState & TextContentPart;
export type TextContentPartComponent = ComponentType<TextContentPartProps>;

export type ReasoningContentPartProps = ContentPartState & ReasoningContentPart;
export type ReasoningContentPartComponent =
  ComponentType<ReasoningContentPartProps>;

export type ImageContentPartProps = ContentPartState & ImageContentPart;
export type ImageContentPartComponent = ComponentType<ImageContentPartProps>;

export type FileContentPartProps = ContentPartState & FileContentPart;
export type FileContentPartComponent = ComponentType<FileContentPartProps>;

export type Unstable_AudioContentPartProps = ContentPartState &
  Unstable_AudioContentPart;
export type Unstable_AudioContentPartComponent =
  ComponentType<Unstable_AudioContentPartProps>;

export type ToolCallContentPartProps<
  TArgs = any,
  TResult = unknown,
> = ContentPartState &
  ToolCallContentPart<TArgs, TResult> & {
    addResult: (result: any) => void;
  };

export type ToolCallContentPartComponent<
  TArgs = any,
  TResult = any,
> = ComponentType<ToolCallContentPartProps<TArgs, TResult>>;
