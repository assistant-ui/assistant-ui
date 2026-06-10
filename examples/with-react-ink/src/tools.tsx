import { Box, Text } from "ink";
import {
  defineToolkit,
  DiffView,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react-ink";

const ApplyPatchToolUI: ToolCallMessagePartComponent<
  { path: string; patch: string },
  unknown
> = ({ args }) => {
  if (!args?.patch) return null;
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="cyan">edit {args.path}</Text>
      <DiffView patch={args.patch} showLineNumbers />
    </Box>
  );
};

export default defineToolkit({
  apply_patch: {
    type: "backend",
    render: ApplyPatchToolUI,
  },
});
