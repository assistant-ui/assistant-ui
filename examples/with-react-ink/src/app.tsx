import { useMemo } from "react";
import { Box, Text } from "ink";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  StatusBarPrimitive,
  Tools,
  useAui,
} from "@assistant-ui/react-ink";
import { Thread } from "./components/thread.js";
import { createScriptedAdapter, MODEL_NAME } from "./scripted-adapter.js";
import toolkit from "./tools.js";

const StatusBar = () => (
  <StatusBarPrimitive.Root>
    <Text dimColor>
      model: <StatusBarPrimitive.ModelName name={MODEL_NAME} /> ·{" "}
      <StatusBarPrimitive.MessageCount /> · <StatusBarPrimitive.Status />
    </Text>
  </StatusBarPrimitive.Root>
);

export const App = () => {
  const adapter = useMemo(() => createScriptedAdapter(), []);
  const runtime = useLocalRuntime(adapter);
  const aui = useAui({
    tools: Tools({ toolkit }),
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text bold color="cyan">
            demo-agent
          </Text>
          <Text dimColor>{"  ~/acme-app"}</Text>
        </Box>
        <StatusBar />
        <Box marginTop={1}>
          <Thread />
        </Box>
      </Box>
    </AssistantRuntimeProvider>
  );
};
