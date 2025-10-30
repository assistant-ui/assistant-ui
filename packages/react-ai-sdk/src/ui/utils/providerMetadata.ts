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

/**
 * Extracts itemId from providerMetadata.
 *
 * Providers like OpenAI use itemId to group related message parts.
 * For example, reasoning messages may be split into multiple paragraphs
 * that all share the same itemId, indicating they're part of one logical thought.
 *
 * @param part - A message part with optional providerMetadata
 * @returns The itemId string if found, undefined otherwise
 */
export const getItemId = (part: PartWithMetadata): string | undefined => {
  const metadata = part.providerMetadata;
  if (!metadata || typeof metadata !== "object") return undefined;

  // Search across all providers in metadata (openai, anthropic, etc.)
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

export type ProviderMetadata = Record<string, unknown> | undefined;

const EXCLUDED_KEYS = new Set([
  "reasoningEncryptedContent",
  "encryptedContent",
]);

export const EXCLUDED_PART_TYPES = new Set(["step-start", "file"]);

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

/**
 * Normalizes a duration value to a positive integer in seconds.
 * Clamps values to minimum 1 second to avoid "0 seconds" display.
 * Returns undefined for invalid values (NaN, negative, zero).
 */
export const normalizeDuration = (value: number | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return undefined;
  }

  return Math.max(1, Math.round(value));
};
