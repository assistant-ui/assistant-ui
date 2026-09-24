"use agent";

import {
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxToolCall,
} from "@earendil-works/pi-ai";
import { setProvider, useDataWriter, useModel, useTool } from "@flue/runtime";
import * as v from "valibot";

const provider = fauxProvider({
  api: "assistant-ui-flue-demo",
  provider: "assistant-ui-flue-demo",
  models: [{ id: "demo" }],
});

setProvider(provider.provider);

const completedTurn = () =>
  fauxAssistantMessage(
    fauxText(
      "The durable demo completed. The tool result and progress card above came from Flue's conversation stream and were rendered by assistant-ui.",
    ),
  );

const toolTurn: Parameters<typeof provider.setResponses>[0][number] = () => {
  provider.appendResponses([completedTurn, toolTurn]);
  return fauxAssistantMessage(
    fauxToolCall("run_durable_demo", {
      requestedAt: new Date().toISOString(),
    }),
    { stopReason: "toolUse" },
  );
};

provider.setResponses([toolTurn]);

export function DemoAgent() {
  useModel("assistant-ui-flue-demo/demo");

  const writeProgress = useDataWriter("jobProgress", {
    schema: v.object({
      status: v.picklist(["running", "done"]),
      step: v.string(),
      progress: v.number(),
    }),
  });

  useTool({
    name: "run_durable_demo",
    description: "Run the deterministic assistant-ui integration demo.",
    input: v.object({ requestedAt: v.string() }),
    async run({ data, log }) {
      log.info("demo started", { requestedAt: data.requestedAt });
      writeProgress({
        status: "running",
        step: "Durable work admitted",
        progress: 20,
      });
      await new Promise((resolve) => setTimeout(resolve, 350));
      writeProgress({
        status: "running",
        step: "Tool execution streaming",
        progress: 65,
      });
      await new Promise((resolve) => setTimeout(resolve, 350));
      writeProgress({
        status: "done",
        step: "Conversation settled",
        progress: 100,
      });
      return {
        output: {
          ok: true,
          requestedAt: data.requestedAt,
          integration: "@assistant-ui/react-flue",
        },
      };
    },
  });

  return "Run the durable demo tool for every user message, then summarize the result.";
}
