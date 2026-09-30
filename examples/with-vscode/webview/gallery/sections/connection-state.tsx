import { ConnectionState } from "@assistant-ui/ui/components/assistant-ui/elements/connection-state.tsx";
import { defineSections } from "../types";
import { State, States, noop } from "./_states";

export default defineSections([
  {
    id: "connection-state",
    title: "Connection state",
    category: "agents",
    notes:
      "Dropped with reconnect, reconnecting on attempt 2, and resumed. The online phase renders nothing.",
    render: () => (
      <States>
        <State label="dropped">
          <ConnectionState phase="dropped" onRetry={noop} />
        </State>
        <State label="reconnecting">
          <ConnectionState phase="reconnecting" attempt={2} />
        </State>
        <State label="resumed">
          <ConnectionState phase="resumed" resumedTokens={184} />
        </State>
        <State label="online (renders nothing)">
          <ConnectionState phase="online" />
        </State>
      </States>
    ),
  },
]);
