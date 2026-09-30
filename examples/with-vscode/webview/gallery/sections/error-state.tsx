import { ErrorState } from "@assistant-ui/ui/components/assistant-ui/elements/error-state.tsx";
import { defineSections } from "../types";

export default defineSections([
  {
    id: "error-state",
    title: "Error state",
    category: "chat",
    notes: "error-state.tsx (standalone): with a retry button, then retrying.",
    render: () => (
      <div className="flex flex-col gap-3">
        <ErrorState
          title="Generation stopped"
          detail="The model hit the output limit after 4,096 tokens."
          retrying={false}
          onRetry={() => {}}
        />
        <ErrorState
          title="Connection lost"
          detail="The extension host did not answer within 30 seconds."
          retrying
          onRetry={() => {}}
        />
      </div>
    ),
  },
]);
