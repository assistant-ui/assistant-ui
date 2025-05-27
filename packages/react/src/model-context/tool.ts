import React, { ComponentType } from "react";
import { BackendTool, FrontendTool, HumanTool } from "assistant-stream";
import { ToolCallContentPartProps } from "../types";
import { JSONSchema7 } from "json-schema";
import { StandardSchemaV1 } from "@standard-schema/spec";
import z from "zod";

// // TODO re-add the inferrence of the parameters

// // Utility type to get all keys of BackendTools as a union
// // and to allow type inference for tool method

// // type AnyTool = BackendTool | FrontendTool | HumanTool;

type InferArgsFromParameters<T> =
  T extends StandardSchemaV1<infer U>
    ? U extends Record<string, unknown>
      ? U
      : Record<string, unknown>
    : T extends JSONSchema7
      ? Record<string, unknown>
      : T extends z.ZodTypeAny
        ? z.infer<T>
        : Record<string, unknown>;

export const createToolbox = <
  BackendTools extends Record<string, BackendTool>,
>() => {
  return <
    T extends Record<string, FrontendTool<any, any> | HumanTool<any, any>> & {
      [K in keyof BackendTools]: {
        render:
          | ComponentType<
              ToolCallContentPartProps<
                InferArgsFromParameters<BackendTools[K]["parameters"]>,
                Awaited<ReturnType<NonNullable<BackendTools[K]["execute"]>>>
              >
            >
          | false;
      };
    },
  >(
    a: T,
  ) => {
    return a;
  };
};

// A generic Toolbox type that maps backend tool keys to their render function, and allows for frontend/human tools as well
export type Toolbox<
  BackendTools extends Record<string, BackendTool> = {
    [key: string]: BackendTool;
  },
  FrontendAndHumanTools extends Record<
    string,
    FrontendTool<any, any> | HumanTool<any, any>
  > = {
    [key: string]: FrontendTool<any, any> | HumanTool<any, any>;
  },
> = {
  // For backend tools, require a render function with the correct args type
  [K in keyof BackendTools]: {
    render: (
      args: Awaited<ReturnType<NonNullable<BackendTools[K]["execute"]>>>,
    ) => React.ReactNode;
  };
} & FrontendAndHumanTools;
