import { ComponentType } from "react";
import { UserUITools } from "../utils/augmentation";
import {
  ToolUIInput,
  ToolUIOutput,
  ToolUIPart,
} from "../client/types/message-types";

export type BackendTool<NAME extends keyof UserUITools & string> = {
  readonly toolType: "backend";
  readonly render: ComponentType<ToolUIPart<NAME>>;
};

export type FrontendTool<NAME extends keyof UserUITools & string> = {
  readonly toolType: "frontend";
  readonly execute: (input: ToolUIInput<NAME>) => Promise<ToolUIOutput<NAME>>;
  readonly render?: ComponentType<ToolUIPart<NAME>>;
};

export type Toolkit = {
  readonly [NAME in keyof UserUITools & string]?: BackendTool<NAME>;
};

export const Toolkit = {
  EMPTY: Object.freeze({} as Toolkit),
};

export const backendTool = <NAME extends keyof UserUITools & string>(
  backendTool: Omit<BackendTool<NAME>, "toolType">
): BackendTool<NAME> => {
  return {
    ...backendTool,
    toolType: "backend",
  };
};

export const frontendTool = <NAME extends keyof UserUITools & string>(
  frontendTool: Omit<FrontendTool<NAME>, "toolType">
): FrontendTool<NAME> => {
  return {
    ...frontendTool,
    toolType: "frontend",
  };
};
