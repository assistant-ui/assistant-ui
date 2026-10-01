import { AssistantModal } from "@assistant-ui/ui/components/assistant-ui/elements/assistant-modal.aui.tsx";
import { defineSections } from "../types";
import { SeededRuntime } from "../runtime";
import { OpenOnMount } from "./_chat-helpers";

// The modal's anchor is `position: fixed`; `contain: layout` makes the box its
// containing block, so the launcher sits in the card's corner.
export default defineSections([
  {
    id: "assistant-modal",
    title: "Assistant modal (closed)",
    category: "chat",
    notes: "assistant-modal.aui.tsx: the floating launcher in the corner.",
    render: () => (
      <SeededRuntime>
        <div className="relative h-20 [contain:layout]">
          <AssistantModal />
        </div>
      </SeededRuntime>
    ),
  },
  {
    id: "assistant-modal-open",
    title: "Assistant modal (open)",
    category: "chat",
    notes:
      "Opened by clicking the launcher on mount. The popup portals to the body and is 400px wide, so at 320px it sticks out of the card to the left.",
    render: () => (
      <SeededRuntime>
        <OpenOnMount selector="button" className="h-148 [contain:layout]">
          <AssistantModal />
        </OpenOnMount>
      </SeededRuntime>
    ),
  },
]);
