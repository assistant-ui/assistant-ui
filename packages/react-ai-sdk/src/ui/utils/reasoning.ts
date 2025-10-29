import type { UIMessage } from "ai";

/**
 * Provider-specific metadata structure.
 * Different AI providers (OpenAI, Anthropic, etc.) store different fields.
 */
export type ProviderMetadataEntry = Record<string, unknown>;

/**
 * Type for message parts that may have provider metadata.
 */
export type PartWithMetadata = {
  providerMetadata?: Record<string, unknown>;
};

export type ProviderMetadata = Record<string, unknown> | undefined;

const EXCLUDED_KEYS = new Set([
  "reasoningEncryptedContent",
  "encryptedContent",
  "itemId",
]);

export const EXCLUDED_PART_TYPES = new Set(["step-start", "file"]);

export const getItemId = (part: PartWithMetadata): string | undefined => {
  const metadata = part.providerMetadata;
  if (!metadata || typeof metadata !== "object") return undefined;

  for (const providerData of Object.values(metadata)) {
    if (
      providerData &&
      typeof providerData === "object" &&
      "itemId" in providerData
    ) {
      return String((providerData as ProviderMetadataEntry)["itemId"]);
    }
  }
  return undefined;
};

export type ReasoningGroup = {
  readonly itemId: string;
  readonly parts: any[];
  readonly firstIndex: number;
};

export type ReasoningGroups = Map<string, ReasoningGroup>;

export const groupReasoningParts = (
  parts: readonly any[],
  extractItemId: (part: PartWithMetadata) => string | undefined = getItemId,
): ReasoningGroups => {
  const groups: ReasoningGroups = new Map();

  parts.forEach((part, index) => {
    if (!part || part.type !== "reasoning") {
      return;
    }

    const itemId = extractItemId(part);
    if (!itemId) {
      return;
    }

    const existing = groups.get(itemId);
    if (existing) {
      groups.set(itemId, {
        itemId,
        parts: [...existing.parts, part],
        firstIndex: Math.min(existing.firstIndex, index),
      });
    } else {
      groups.set(itemId, {
        itemId,
        parts: [part],
        firstIndex: index,
      });
    }
  });

  return groups;
};

export const mergeReasoningGroupText = (group: ReasoningGroup) =>
  group.parts
    .filter(Boolean)
    .map((part) => part.text || "")
    .join("\n\n");

export const sanitizeProviderMetadata = (metadata: ProviderMetadata) => {
  if (!metadata || typeof metadata !== "object") {
    return metadata;
  }

  const sanitize = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      const sanitizedArray = value
        .map((item) => sanitize(item))
        .filter((item) => item !== undefined);

      return sanitizedArray.length ? sanitizedArray : undefined;
    }

    if (!value || typeof value !== "object") {
      return value;
    }

    const entries = Object.entries(value).flatMap(([key, val]) => {
      if (EXCLUDED_KEYS.has(key)) {
        return [] as const;
      }

      const sanitizedValue = sanitize(val);
      if (sanitizedValue === undefined) {
        return [] as const;
      }

      return [[key, sanitizedValue] as const];
    });

    if (entries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(entries);
  };

  const sanitized = sanitize(metadata);
  if (!sanitized || typeof sanitized !== "object") {
    return undefined;
  }

  return sanitized as Record<string, unknown>;
};

export const filterMessageParts = <T extends { type: string }>(
  parts: readonly T[],
) => parts.filter((part) => !EXCLUDED_PART_TYPES.has(part.type));

export const normalizeDuration = (value: number | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return undefined;
  }

  return Math.max(1, Math.round(value));
};

export const makeReasoningRuntimeKey = (messageId: string, ordinal: number) =>
  `${messageId}#r${ordinal}`;

export const makeReasoningStoredKey = (ordinal: number) => `r${ordinal}`;

export const stripItemIdFromProviderMetadata = (metadata: ProviderMetadata) => {
  if (!metadata || typeof metadata !== "object") {
    return metadata;
  }

  let changed = false;

  const entries = Object.entries(metadata)
    .map(([provider, value]) => {
      if (!value || typeof value !== "object") {
        return [provider, value] as const;
      }

      if ("itemId" in (value as Record<string, unknown>)) {
        const { itemId: _removed, ...rest } = value as Record<string, unknown>;
        changed = true;
        if (Object.keys(rest).length === 0) {
          return null;
        }
        return [provider, rest] as const;
      }

      return [provider, value] as const;
    })
    .filter((entry): entry is readonly [string, unknown] => entry !== null);

  if (!changed) {
    return metadata;
  }

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries) as Record<string, unknown>;
};

type ReasoningPart = {
  type: string;
  state?: string;
  providerMetadata?: Record<string, unknown>;
};

/**
 * Provides deterministic ordinals for reasoning chunks within a single message.
 * Ordinals group repeated provider itemIds and fall back to part index when IDs are absent.
 */
export const createReasoningOrdinalContext = () => {
  const itemIdOrdinals = new Map<string, number>();
  const fallbackOrdinals = new Map<number, number>();
  let nextOrdinal = 0;

  const getOrdinal = (part: ReasoningPart, index: number) => {
    const itemId = getItemId(part);
    if (itemId) {
      let ordinal = itemIdOrdinals.get(itemId);
      if (ordinal === undefined) {
        ordinal = nextOrdinal++;
        itemIdOrdinals.set(itemId, ordinal);
      }
      return { ordinal, itemId } as const;
    }

    let ordinal = fallbackOrdinals.get(index);
    if (ordinal === undefined) {
      ordinal = nextOrdinal++;
      fallbackOrdinals.set(index, ordinal);
    }
    return { ordinal } as const;
  };

  return { getOrdinal } as const;
};

/**
 * Resolves a reasoning duration using runtime and persisted metadata.
 * Returns the normalized duration (seconds) and the stored key (`rN`).
 */
export const resolveReasoningDuration = (
  runtimeDurations: Record<string, number>,
  storedDurations: Record<string, number> | undefined,
  messageId: string,
  ordinal: number,
) => {
  const runtimeKey = makeReasoningRuntimeKey(messageId, ordinal);
  const storedKey = makeReasoningStoredKey(ordinal);

  if (runtimeKey in runtimeDurations) {
    const normalized = normalizeDuration(runtimeDurations[runtimeKey]);
    if (normalized !== undefined)
      return { duration: normalized, storedKey } as const;
  }

  if (storedDurations && storedKey in storedDurations) {
    const normalized = normalizeDuration(storedDurations[storedKey]!);
    if (normalized !== undefined)
      return { duration: normalized, storedKey } as const;
  }

  return { duration: undefined, storedKey } as const;
};

/**
 * Removes provider itemId metadata from assistant reasoning parts before
 * sending messages back to a provider. This prevents replaying stale IDs.
 */
export const sanitizeHistoryForOutbound = <
  UI_MESSAGE extends UIMessage = UIMessage,
>(
  messages: UI_MESSAGE[],
): UI_MESSAGE[] =>
  messages.map((message) => {
    if (message.role !== "assistant") {
      return message;
    }

    const parts = message.parts?.map((part) => {
      if (part?.type !== "reasoning" || !part.providerMetadata) {
        return part;
      }

      const providerMetadata = stripItemIdFromProviderMetadata(
        part.providerMetadata,
      );

      if (!providerMetadata) {
        const { providerMetadata: _removed, ...rest } = part;
        return rest;
      }

      return {
        ...part,
        providerMetadata,
      };
    });

    return {
      ...message,
      ...(parts ? { parts } : {}),
    } as UI_MESSAGE;
  });
