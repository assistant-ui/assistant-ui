import type { ToolDefinition } from "@assistant-ui/react";
import type { GenerativeUILibrary, GenerativeUIToolkit } from "./types";

export function jsonGenerativeUITools({
  library,
}: {
  library: GenerativeUILibrary;
}): GenerativeUIToolkit {
  const presentTool: ToolDefinition<any, any> = {
    type: "frontend",
    description: "Present a UI component to the user",
    parameters: {
      type: "object",
      properties: {
        component: {
          type: "string",
          description: "The name of the component to render",
        },
        props: {
          type: "object",
          description: "The props to pass to the component",
        },
      },
      required: ["component"],
    },
    execute: async ({ component, props }) => {
      return { component, props };
    },
  };

  return {
    present: presentTool,
  };
}
