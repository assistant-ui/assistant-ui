import { AssistantShell } from "../components/assistant-shell";
import { ToolProvider } from "../components/tool-provider";

export default function Page() {
  return (
    <ToolProvider>
      <AssistantShell />
    </ToolProvider>
  );
}
