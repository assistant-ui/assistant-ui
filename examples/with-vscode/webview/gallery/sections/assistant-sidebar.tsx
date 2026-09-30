import { AssistantSidebar } from "@assistant-ui/ui/components/assistant-ui/elements/assistant-sidebar.aui.tsx";
import { defineSections } from "../types";
import { SeededRuntime } from "../runtime";

export default defineSections([
  {
    id: "assistant-sidebar",
    title: "Assistant sidebar",
    category: "chat",
    notes:
      "assistant-sidebar.aui.tsx: a resizable split with the app on the left and the kit Thread on the right.",
    render: () => (
      <SeededRuntime>
        <div className="h-120">
          <AssistantSidebar>
            <div className="bg-muted/30 flex h-full items-center justify-center p-6 text-center">
              <div>
                <p className="text-sm font-medium">Workspace</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Drag the handle to resize the assistant.
                </p>
              </div>
            </div>
          </AssistantSidebar>
        </div>
      </SeededRuntime>
    ),
  },
]);
