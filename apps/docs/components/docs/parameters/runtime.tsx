import { ParametersTable } from "@/components/docs";

export const AssistantRuntimeProviderProps = () => {
  return (
    <ParametersTable
      type="AssistantRuntimeProviderProps"
      parameters={[
        {
          name: "runtime",
          type: "AssistantRuntime",
          required: true,
          description: "The runtime to provide to the rest of your app.",
          children: [
            {
              type: "AssistantRuntime",
              parameters: [
                {
                  name: "capabilities",
                  type: "RuntimeCapabilities",
                  required: true,
                  description: "The capabilities of the runtime.",
                  children: [
                    {
                      type: "RuntimeCapability",
                      parameters: [
                        {
                          name: "edit",
                          type: "boolean",
                          required: true,
                          description:
                            "Whether the runtime supports editing messages.",
                        },
                        {
                          name: "reload",
                          type: "boolean",
                          required: true,
                          description:
                            "Whether the runtime supports reloading messages.",
                        },
                        {
                          name: "cancel",
                          type: "boolean",
                          required: true,
                          description:
                            "Whether the runtime supports cancelling runs.",
                        },
                        {
                          name: "unstable_copy",
                          type: "boolean",
                          required: true,
                          description:
                            "Whether the runtime supports copying messages.",
                        },
                        {
                          name: "speak",
                          type: "boolean",
                          required: true,
                          description:
                            "Whether the runtime supports speaking messages.",
                        },
                        {
                          name: "attachments",
                          type: "boolean",
                          required: true,
                          description:
                            "Whether the runtime supports attachments.",
                        },
                      ],
                    },
                  ],
                },
                {
                  name: "messages",
                  type: "readonly ThreadMessage[]",
                  required: true,
                  description: "The messages in the thread.",
                },
                {
                  name: "isDisabled",
                  type: "boolean",
                  required: true,
                  description: "Whether the thread is disabled.",
                },
                {
                  name: "getBranches",
                  type: "(messageId: string) => readonly string[]",
                  required: true,
                  description: "A function to get the branches for a message.",
                },
                {
                  name: "switchToBranch",
                  type: "(branchId: string) => void",
                  required: true,
                  description: "A function to switch to a branch.",
                },
                {
                  name: "append",
                  type: "(message: AppendMessage) => void",
                  required: true,
                  description: "A function to append a message to the thread.",
                },
                {
                  name: "startRun",
                  type: "(parentId: string | null) => void",
                  required: true,
                  description: "A function to start a run.",
                },
                {
                  name: "cancelRun",
                  type: "() => void",
                  required: true,
                  description: "A function to cancel a run.",
                },
                {
                  name: "addToolResult",
                  type: "(options: AddToolResultOptions) => void",
                  required: true,
                  description: "A function to add a tool result.",
                },
                {
                  name: "subscribe",
                  type: "(callback: () => void) => Unsubscribe",
                  required: true,
                  description: "A function to subscribe to updates.",
                },
                {
                  name: "registerModelContextProvider",
                  type: "(provider: ModelContextProvider) => Unsubscribe",
                  required: true,
                  description:
                    "A function to register a model context provider.",
                },
              ],
            },
          ],
        },
      ]}
    />
  );
};
