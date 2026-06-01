import { Box, Text } from "ink";
import { makeAssistantToolUI, DiffView } from "@assistant-ui/react-ink";

export const ApplyPatchToolUI = makeAssistantToolUI<
  { path: string; patch: string },
  unknown
>({
  toolName: "apply_patch",
  render: ({ args }) => {
    if (!args?.patch) return null;
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text color="cyan">edit {args.path}</Text>
        <DiffView patch={args.patch} showLineNumbers />
      </Box>
    );
  },
});
