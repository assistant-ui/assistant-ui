import { isRecord } from "../common";
import type {
  McpManagerPreview,
  McpServerPreview,
  McpToolPreview,
} from "./types";

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const parseTool = (value: unknown): McpToolPreview | null => {
  if (!isRecord(value)) return null;
  const name = asString(value.name);
  if (!name) return null;
  const description = asString(value.description);
  return { name, ...(description ? { description } : {}) };
};

const parseServer = (value: unknown): McpServerPreview | null => {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  if (!id) return null;

  const lastError = isRecord(value.lastError)
    ? asString(value.lastError.message)
    : undefined;
  const kind = asString(value.kind);
  const url = asString(value.url);
  const authorizationUrl = asString(value.authorizationUrl);
  const tools = Array.isArray(value.tools)
    ? value.tools
        .map((tool) => parseTool(tool))
        .filter((tool): tool is McpToolPreview => Boolean(tool))
    : [];

  return {
    id,
    name: asString(value.name) ?? id,
    connectionState: asString(value.connectionState) ?? "unknown",
    tools,
    ...(kind ? { kind } : {}),
    ...(url ? { url } : {}),
    ...(lastError ? { lastError } : {}),
    ...(authorizationUrl ? { authorizationUrl } : {}),
  };
};

export const parseMcpManager = (value: unknown): McpManagerPreview | null => {
  if (!isRecord(value)) return null;

  const source = Array.isArray(value.servers)
    ? value.servers
    : [
        ...(Array.isArray(value.connectors) ? value.connectors : []),
        ...(Array.isArray(value.customServers) ? value.customServers : []),
      ];

  const servers = source
    .map((server) => parseServer(server))
    .filter((server): server is McpServerPreview => Boolean(server));

  return {
    servers,
    ...(typeof value.isHydrated === "boolean"
      ? { isHydrated: value.isHydrated }
      : {}),
  };
};
