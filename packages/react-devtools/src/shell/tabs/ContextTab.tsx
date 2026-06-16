import { McpView } from "../../views/mcp";
import { ModelContextView } from "../../views/model-context";
import { renderToolUIsStatePreview } from "../statePreview";
import type { DevToolsTabContext } from "../registry";

export const ContextTab = ({ data }: DevToolsTabContext) => {
  const mcp = data.state.mcp;
  const toolUIs = data.state.tools;

  return (
    <div className="flex flex-col gap-4">
      <ModelContextView modelContext={data.modelContext} />
      {mcp !== undefined ? <McpView value={mcp} /> : null}
      {toolUIs !== undefined ? renderToolUIsStatePreview(toolUIs) : null}
    </div>
  );
};
