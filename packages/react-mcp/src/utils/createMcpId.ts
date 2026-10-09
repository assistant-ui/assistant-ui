import { generateId } from "@assistant-ui/core";

/**
 * Both forms are alphanumeric or hyphenated, so neither can contain the
 * separators `assertValidServerId` reserves.
 */
export const createMcpId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `mcp-${generateId()}`;
