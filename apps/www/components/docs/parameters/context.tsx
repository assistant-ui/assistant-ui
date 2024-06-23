import { ParametersTable } from "@/components/docs";

export const AssistantContextValue = () => {
  return (
    <ParametersTable
      type="AssistantContextValue"
      parameters={[
        {
          name: "useModelConfig",
          type: "ReadonlyStore<ModelConfigState>",
          required: true,
          description:
            "Configuration of the model (system prompt, tools, etc.)",
          children: [
            {
              type: "ModelConfigState",
              parameters: [
                {
                  name: "getModelConfig",
                  type: "() => ModelConfig",
                  description: "Gets the current model config.",
                  required: true,
                  children: [
                    {
                      type: "ModelConfig",
                      parameters: [
                        {
                          name: "system",
                          type: "string",
                          description: "The system prompt.",
                        },
                        {
                          name: "tools",
                          type: "Record<string, Tool<any, any>>",
                          description: "The tools available to the model.",
                          children: [
                            {
                              type: "Tool<TArgs, TResult>",
                              parameters: [
                                {
                                  name: "description",
                                  type: "string",
                                  description: "The tool description.",
                                },
                                {
                                  name: "parameters",
                                  type: "z.ZodType<TArgs>",
                                  description: "The tool parameters.",
                                },
                                {
                                  name: "execute",
                                  type: "(args: TArgs) => Promise<TResult>",
                                  description: "The tool execution function.",
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  name: "registerModelConfigProvider",
                  type: "(provider: () => ModelConfig) => Unsubscribe",
                  description:
                    "Registers a model config provider to update the model config.",
                  required: true,
                },
              ],
            },
          ],
        },
        {
          name: "useToolUIs",
          type: "ReadonlyStore<ToolUIsState>",
          required: true,
          description: "Tool UIs to render on tool calls.",
          children: [
            {
              type: "ToolUIsState",
              parameters: [
                {
                  name: "getToolUI",
                  type: "(toolName: string) => ToolCallContentPartProps",
                  description:
                    "Gets the current tool UI for a given tool name.",
                  required: true,
                  children: [
                    {
                      type: "ToolCallContentPartProps<TArgs, TResult>",
                      parameters: [
                        {
                          name: "part",
                          type: "ToolCallContentPart<TArgs, TResult>",
                          description: "The tool call content part.",
                        },
                        {
                          name: "status",
                          type: "'in_progress' | 'done' | 'error'",
                          description: "The tool call status.",
                        },
                        {
                          name: "addResult",
                          type: "(result: TResult) => void",
                          description: "Adds a result to the tool call.",
                        },
                      ],
                    },
                  ],
                },
                {
                  name: "setToolUI",
                  type: "(toolName: string, render: ToolCallContentPartComponent) => Unsubscribe",
                  description: "Sets the tool UI.",
                  required: true,
                },
              ],
            },
          ],
        },
      ]}
    />
  );
};
