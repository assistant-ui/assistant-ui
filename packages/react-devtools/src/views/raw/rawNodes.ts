import type { ApiInfo } from "../../data/types";
import { isRecord } from "../../utils/common";
import {
  parseComposerPreview,
  parseThreadListPreview,
  parseThreadPreview,
} from "../thread";
import { parseScopes } from "../scopes/parse";
import type { NavGroup } from "../nav";

export type RawNode =
  | {
      id: `raw:slice:${string}`;
      kind: "slice";
      key: string;
      hint: string | null;
    }
  | { id: "raw:scopes"; kind: "scopes"; count: number };

export type RawNavGroup = NavGroup<RawNode>;

const SLICE_ORDER = [
  "thread",
  "threads",
  "threadListItem",
  "threadlistitem",
  "composer",
  "tools",
  "mcp",
] as const;

const sortSliceKeys = (keys: string[]) => {
  const rank = new Map<string, number>(
    SLICE_ORDER.map((key, index) => [key, index]),
  );
  return [...keys].sort((left, right) => {
    const leftRank = rank.get(left) ?? rank.get(left.toLowerCase()) ?? 999;
    const rightRank = rank.get(right) ?? rank.get(right.toLowerCase()) ?? 999;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.localeCompare(right);
  });
};

export const sliceHint = (key: string, value: unknown): string | null => {
  switch (key) {
    case "thread": {
      const thread = parseThreadPreview(value);
      if (!thread) return null;
      return `${thread.messages.length} msgs`;
    }
    case "threads": {
      const threads = parseThreadListPreview(value);
      if (!threads) return null;
      return `${threads.threadIds.length} active`;
    }
    case "composer": {
      const composer = parseComposerPreview(value);
      if (!composer) return null;
      return `${composer.textLength} chars`;
    }
    case "tools": {
      if (!isRecord(value)) return null;
      const count = Object.keys(value).length;
      return count ? `${count} mapped` : "empty";
    }
    case "mcp": {
      if (!isRecord(value)) return null;
      const servers = Array.isArray(value.servers)
        ? value.servers.length
        : (Array.isArray(value.connectors) ? value.connectors.length : 0) +
          (Array.isArray(value.customServers) ? value.customServers.length : 0);
      return servers ? `${servers} servers` : "empty";
    }
    default:
      return null;
  }
};

export const buildRawNav = (data: ApiInfo): RawNavGroup[] => {
  const sliceKeys = sortSliceKeys(Object.keys(data.state));
  const stateNodes: RawNode[] = sliceKeys.map((key) => ({
    id: `raw:slice:${key}`,
    kind: "slice",
    key,
    hint: sliceHint(key, data.state[key]),
  }));

  const groups: RawNavGroup[] = [];
  if (stateNodes.length) {
    groups.push({ label: "State", nodes: stateNodes });
  }

  if (data.scopes !== undefined) {
    groups.push({
      label: "Graph",
      nodes: [
        {
          id: "raw:scopes",
          kind: "scopes",
          count: parseScopes(data.scopes).length,
        },
      ],
    });
  }

  return groups;
};
