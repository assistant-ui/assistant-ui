// import { BackendTool, FrontendTool, HumanTool, Tool } from "assistant-stream";
// import { JSONSchema7 } from "json-schema";
// import { z } from "zod";
// import type { StandardSchemaV1 } from "@standard-schema/spec";
// // import { ToolCallContentPartComponent } from "../types";

import {
  ToolParameters,
  inferParameters,
  ToolExecutionOptions,
  Tool,
  tool,
} from "ai";

// // TODO re-add the inferrence of the parameters

// // Utility type to get all keys of BackendTools as a union
// // and to allow type inference for tool method

// // type AnyTool = BackendTool | FrontendTool | HumanTool;

// // class ToolboxBuilder<BackendTools extends Record<string, BackendTool>> {
// //   private tools: Record<string, AnyTool> = {};

// //   // Overload signatures
// //   tool<Name extends keyof BackendTools>(
// //     name: Name,
// //     tool: BackendTools[Name] & {
// //       render: (
// //         args: Awaited<ReturnType<NonNullable<BackendTools[Name]["execute"]>>>,
// //       ) => React.ReactNode;
// //     },
// //   ): this;
// //   tool<
// //     Name extends string,
// //     TParameters extends JSONSchema7 | StandardSchemaV1 | z.ZodTypeAny,
// //     TResult = unknown,
// //   >(
// //     name: Name,
// //     tool: FrontendTool<TParameters, TResult> | HumanTool<TParameters, TResult>,
// //   ): this;

// //   tool(name: string, tool: AnyTool): this {
// //     this.tools[name] = tool;
// //     return this;
// //   }
// // }

// // function tool<
// //   BackendTools extends Record<string, BackendTool>,
// //   Name extends keyof BackendTools,
// // >(
// //   tool: BackendTools[Name] & {
// //     render: (
// //       args: Awaited<ReturnType<NonNullable<BackendTools[Name]["execute"]>>>,
// //     ) => React.ReactNode;
// //   },
// // ): BackendTools[Name] & {
// //   render: (
// //     args: Awaited<ReturnType<NonNullable<BackendTools[Name]["execute"]>>>,
// //   ) => React.ReactNode;
// // };
// // Overloads for backendTool helper

// type ToolExecutionContext = {
//   toolCallId: string;
//   abortSignal: AbortSignal;
// };

// type InferArgsFromParameters<T> =
//   T extends StandardSchemaV1<infer U>
//     ? U extends Record<string, unknown>
//       ? U
//       : Record<string, unknown>
//     : T extends JSONSchema7
//       ? Record<string, unknown>
//       : T extends z.ZodTypeAny
//         ? T
//         : never;

// export function frontendTool<
//   // Zod type any is here to support users who haven't upgraded to v4
//   TParameters extends JSONSchema7 | StandardSchemaV1 | z.ZodTypeAny,
//   TResult,
// >(
//   tool: Omit<FrontendTool<TParameters, TResult>, "execute"> & {
//     execute: (
//       args: InferArgsFromParameters<TParameters>,
//       context: ToolExecutionContext,
//     ) => TResult | Promise<TResult>;
//   },
// ) {
//   return tool;
// }

// // function tool(t: FrontendTool<any, any> | HumanTool<any, any>) {
// //   return t;
// // }

// export function createToolbox<BackendTools extends Record<string, BackendTool>>(
//   args: (t: typeof frontendTool) => {
//     [key in keyof BackendTools]: BackendTools[key] & {
//       render: (
//         args: Awaited<ReturnType<NonNullable<BackendTools[key]["execute"]>>>,
//       ) => React.ReactNode;
//     };
//   } & {
//     [k: string]: FrontendTool<any, any> | HumanTool<any, any>;
//   },
// ) {
//   return args(frontendTool);
// }

// export const testTypes = <
//   BackendTools extends Record<string, BackendTool>,
//   // Tools = Record<string, FrontendTool<any, any> | HumanTool<any, any>>,
// >(
//   args: (t: typeof frontendTool) => {
//     [key in keyof BackendTools]: BackendTools[key] extends BackendTool
//       ? boolean
//       : never;
//   } & {
//     [k: string]:
//       | FrontendTool<any, any>
//       | HumanTool<any, any> extends BackendTool
//       ? never
//       : FrontendTool<any, any>;
//   },
// ) => {
//   return args(frontendTool);
// };

// Type for toolbox input - ensures execute params match schema
type ToolboxInput<T extends Record<string, ToolConfig<any, any>>> = {
  [K in keyof T]: T[K];
};

// Helper type for tool configuration
type ToolConfig<PARAMETERS extends ToolParameters, RESULT> = {
  description?: string;
  parameters: PARAMETERS;
  execute: (
    args: inferParameters<PARAMETERS>,
    options: ToolExecutionOptions,
  ) => PromiseLike<RESULT>;
};

// Output type - converts to actual Tool record
type ToolRecord<T extends Record<string, ToolConfig<any, any>>> = {
  [K in keyof T]: T[K] extends ToolConfig<infer P, infer R>
    ? Tool<P, R>
    : never;
};

// // Main function to create toolbox
// export function createToolbox<T extends Record<string, ToolConfig<any, any>>>(
//   toolConfigs: T,
// ): ToolRecord<T> {
//   const toolRecord = {} as ToolRecord<T>;

//   for (const [name, config] of Object.entries(toolConfigs)) {
//     toolRecord[name as keyof T] = tool({
//       ...(config.description && { description: config.description }),
//       parameters: config.parameters,
//       execute: config.execute,
//     }) as ToolRecord<T>[keyof T];
//   }

//   return toolRecord;
// }

export function createToolbox<
  T extends Record<
    string,
    {
      description?: string;
      parameters: ToolParameters;
      execute: (args: any, options: ToolExecutionOptions) => any;
    }
  >,
>(toolConfigs: {
  [K in keyof T]: {
    description?: string;
    parameters: T[K]["parameters"];
    execute: (
      args: inferParameters<T[K]["parameters"]>,
      options: ToolExecutionOptions,
    ) => any;
  };
}): { [K in keyof T]: Tool<T[K]["parameters"], any> } {
  const toolRecord = {} as any;

  for (const [name, config] of Object.entries(toolConfigs)) {
    toolRecord[name] = tool(config);
  }

  return toolRecord;
}
