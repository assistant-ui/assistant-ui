import type { ApiInfo } from "../../data/types";
import { McpView } from "../mcp";
import {
  CallSettingsPane,
  ConfigPane,
  SystemPromptPane,
  ToolDetailPane,
} from "../model-context/ModelContextView";
import { ToolUIsView } from "./ToolUIsView";
import type { ContextNode } from "./contextNodes";

export const ContextDetail = ({
  node,
  data,
}: {
  node: ContextNode;
  data: ApiInfo;
}) => {
  const model = data.modelContext;

  switch (node.kind) {
    case "system":
      return <SystemPromptPane system={node.preview} />;
    case "tool":
      return <ToolDetailPane tool={node.tool} />;
    case "callSettings":
      return <CallSettingsPane value={model?.callSettings ?? {}} />;
    case "config":
      return <ConfigPane value={model?.config ?? {}} />;
    case "mcp":
      return <McpView value={data.state.mcp} compact />;
    case "toolUIs":
      return <ToolUIsView value={data.state.tools} />;
    default:
      return null;
  }
};
