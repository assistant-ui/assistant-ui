import { BackendTool, FrontendTool, HumanTool } from "assistant-stream";
import { JSONSchema7 } from "json-schema";
import { z } from "zod";
import type { StandardSchemaV1 } from "@standard-schema/spec";
// import { ToolCallContentPartComponent } from "../types";

// TODO re-add the inferrence of the parameters

// Utility type to get all keys of BackendTools as a union
// and to allow type inference for tool method

type AnyTool = BackendTool | FrontendTool | HumanTool;

// type ToolTypeForName<
//   BackendTools extends Record<string, BackendTool>,
//   Name extends string,
//   ToolDef = FrontendTool | HumanTool,
// > = Name extends keyof BackendTools
//   ? {
//       render: (
//         args: BackendTools[Name]["execute"] extends (...args: any) => infer R
//           ? Awaited<R>
//           : never,
//       ) => React.ReactNode;
//     } // Must be BackendTool
//   : ToolDef extends FrontendTool<infer TParameters, infer TResult>
//     ? FrontendTool<TParameters, TResult>
//     : FrontendTool<JSONSchema7 | StandardSchemaV1 | z.ZodTypeAny, unknown>;

class ToolboxBuilder<BackendTools extends Record<string, BackendTool>> {
  private tools: Record<string, AnyTool> = {};

  // Overload signatures
  tool<Name extends keyof BackendTools>(
    name: Name,
    tool: BackendTools[Name] & {
      render: (
        args: Awaited<ReturnType<NonNullable<BackendTools[Name]["execute"]>>>,
      ) => React.ReactNode;
    },
  ): this;
  tool<
    Name extends string,
    TParameters extends JSONSchema7 | StandardSchemaV1 | z.ZodTypeAny,
    TResult = unknown,
  >(name: Name, tool: FrontendTool<TParameters, TResult> | HumanTool): this;

  // Single implementation
  tool(name: string, tool: AnyTool): this {
    this.tools[name] = tool;
    return this;
  }

  // Optionally, you can add a getter for the tools if needed
  getTools(): Record<string, AnyTool> {
    return this.tools;
  }
}

export function createToolbox<
  BackendTools extends Record<string, BackendTool>,
>() {
  return new ToolboxBuilder<BackendTools>();
}
