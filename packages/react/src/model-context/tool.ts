import React from "react";
import { BackendTool, FrontendTool, HumanTool } from "assistant-stream";

// // TODO re-add the inferrence of the parameters

// // Utility type to get all keys of BackendTools as a union
// // and to allow type inference for tool method

// // type AnyTool = BackendTool | FrontendTool | HumanTool;

export const createToolbox = <
  BackendTools extends Record<string, BackendTool>,
>() => {
  return <
    T extends Record<string, FrontendTool<any, any> | HumanTool<any, any>> & {
      [K in keyof BackendTools]: {
        render: (
          args: Awaited<ReturnType<NonNullable<BackendTools[K]["execute"]>>>,
        ) => React.ReactNode;
      };
    },
  >(
    a: T,
  ) => {
    return a;
  };
};
