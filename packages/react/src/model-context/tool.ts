import { ComponentType, useCallback } from "react";
import { BackendTool, FrontendTool, HumanTool } from "assistant-stream";
import { ToolCallContentPartProps } from "../types";
import { JSONSchema7 } from "json-schema";
import { StandardSchemaV1 } from "@standard-schema/spec";
import z from "zod";
import {
  useAssistantRuntime,
  useToolUIsStore,
} from "../context/react/AssistantContext";
import { useThreadModelContext } from "../context";

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
    const useTool = <Name extends keyof T>(
      name: Name,
    ): Name extends keyof BackendTools
      ? {
          setUI: (
            ui: ComponentType<
              ToolCallContentPartProps<
                InferArgsFromParameters<BackendTools[Name]["parameters"]>,
                Awaited<ReturnType<NonNullable<BackendTools[Name]["execute"]>>>
              >
            >,
          ) => void;
        }
      : {
          enable: () => void;
          disable: () => void;
          setUI: (
            ui: T[Name] extends FrontendTool<any, any> | HumanTool<any, any>
              ? ComponentType<
                  ToolCallContentPartProps<
                    InferArgsFromParameters<T[Name]["parameters"]>,
                    Awaited<ReturnType<NonNullable<T[Name]["execute"]>>>
                  >
                >
              : never,
          ) => void;
        } => {
      const runtime = useAssistantRuntime();
      const useToolUIs = useToolUIsStore();
      const modelContext = useThreadModelContext();

      const disable = useCallback(() => {
        const existingTool = modelContext.tools?.[String(name)];
        if (!existingTool) {
          return;
        }

        runtime.registerModelContextProvider({
          getModelContext: () => {
            const tools = {
              ...modelContext.tools,
              [name]: {
                ...existingTool,
                disabled: true,
              },
            };

            return {
              ...modelContext,
              tools,
            };
          },
        });
      }, [modelContext, name, runtime]);

      const enable = useCallback(() => {
        const existingTool = modelContext.tools?.[String(name)];
        if (!existingTool) {
          return;
        }

        runtime.registerModelContextProvider({
          getModelContext: () => {
            const tools = {
              ...modelContext.tools,
              [name]: {
                ...existingTool,
                disabled: false,
              },
            };

            return {
              ...modelContext,
              tools,
            };
          },
        });
      }, [modelContext, name, runtime]);

      const tool = modelContext.tools?.[String(name)];

      // if (tool?.type === "frontend" || tool?.type === "human") {
      //   return {
      //     enable: enable,
      //     disable: disable,
      //     setUI: (ui: any) => {
      //       useToolUIs.getState().setToolUI(String(name), ui);
      //     },
      //   };
      // } else {
      //   return {
      //     setUI: (ui: any) => {
      //       useToolUIs.getState().setToolUI(String(name), ui);
      //     },
      //   };
      // }

      return new Proxy({} as any, {
        get: (_, prop) => {
          if (prop === "setUI") {
            return (ui: any) => {
              useToolUIs.getState().setToolUI(String(name), ui);
            };
          }

          if (tool?.type === "frontend" || tool?.type === "human") {
            if (prop === "enable") {
              return enable;
            }
            if (prop === "disable") {
              return disable;
            }
          }
          return undefined;
        },
      });
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
