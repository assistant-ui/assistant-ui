import React, { ComponentType } from "react";
import { BackendTool, FrontendTool, HumanTool } from "assistant-stream";
import { ToolCallContentPartProps } from "../types";
import { JSONSchema7 } from "json-schema";
import { StandardSchemaV1 } from "@standard-schema/spec";
import z from "zod";
import {
  // useAssistantRuntime,
  useToolUIsStore,
} from "../context/react/AssistantContext";

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
    T extends {
      [K in keyof BackendTools]: BackendTools[K] extends undefined
        ? FrontendTool<any, any> | HumanTool<any, any>
        : {
            render: ComponentType<
              ToolCallContentPartProps<
                InferArgsFromParameters<BackendTools[K]["parameters"]>,
                Awaited<ReturnType<NonNullable<BackendTools[K]["execute"]>>>
              >
            >;
          };
    },
  >(
    a: T,
  ) => {
    /*
    useTool(name: keyof T) 
      - disable()
      - setUI(ui: React.ReactNode)
    */

    const useTool = <Name extends keyof T>(name: Name) => {
      // const runtime = useAssistantRuntime();
      const useToolUIs = useToolUIsStore();

      // const context = useContext(AssistantContext);

      // context?.useAssistantRuntime().registerModelContextProvider

      return {
        // disable: () => {
        //   runtime.registerModelContextProvider({
        //     getModelContext: () => ({
        //       tools: { [name]: { disabled: true } },
        //     }),
        //   });
        // },
        // enable: () => {
        //   runtime.registerModelContextProvider({
        //     getModelContext: () => ({
        //       tools: { [name]: { disabled: false } },
        //     }),
        //   });
        // },
        setUI: (
          ui: Name extends keyof BackendTools
            ? ComponentType<
                ToolCallContentPartProps<
                  InferArgsFromParameters<BackendTools[Name]["parameters"]>,
                  Awaited<
                    ReturnType<NonNullable<BackendTools[Name]["execute"]>>
                  >
                >
              >
            : T[Name] extends FrontendTool<any, any>
              ? ComponentType<
                  ToolCallContentPartProps<
                    InferArgsFromParameters<T[Name]["parameters"]>,
                    Awaited<ReturnType<NonNullable<T[Name]["execute"]>>>
                  >
                >
              : never,
        ) => {
          useToolUIs.getState().setToolUI(name as string, ui);
        },
      };
    };

    return {
      tools: a,
      useTool,
    };
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
