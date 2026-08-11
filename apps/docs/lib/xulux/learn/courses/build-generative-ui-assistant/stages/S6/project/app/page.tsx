import { AssistantShell } from "../components/assistant-shell";
import { ToolProvider } from "@/lib/xulux/learn/courses/build-generative-ui-assistant/stages/S5/project/components/tool-provider";

export default function Page() {
  return (
    <ToolProvider>
      <AssistantShell />
    </ToolProvider>
  );
}
