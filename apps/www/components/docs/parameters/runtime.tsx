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
                  name: "messages",
                  type: "readonly ThreadMessage[]",
                  required: true,
                  description: "The messages in the thread.",
                },
                {
                  name: "isRunning",
                  type: "boolean",
                  required: true,
                  description: "Whether the thread is running.",
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
                  type: "(toolCallId: string, result: any) => void",
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
                  name: "registerModelConfigProvider",
                  type: "(provider: ModelConfigProvider) => Unsubscribe",
                  required: true,
                  description:
                    "A function to register a model config provider.",
                },
              ],
            },
          ],
        },
      ]}
    />
  );
};
