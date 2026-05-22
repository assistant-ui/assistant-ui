import type { MCPConnector } from "./mcp-scope";
import { assertValidServerId } from "./utils/serverId";

export function defineConnector(connector: MCPConnector): MCPConnector {
  assertValidServerId(connector.id);
  return connector;
}
