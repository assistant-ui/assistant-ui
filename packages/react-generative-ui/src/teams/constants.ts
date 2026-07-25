import type {
  TeamsAdaptiveCard,
  TeamsCardAttachment,
  TeamsCardElement,
  TeamsSubmitAction,
  TeamsSubmitData,
} from "./types";

/** The Adaptive Card schema version emitted by {@link toAdaptiveCard}: the Teams desktop/web cap (mobile clients cap at 1.2). */
export const AC_VERSION = "1.5";

/** The `$schema` URL stamped on every emitted card. */
export const ADAPTIVE_CARD_SCHEMA =
  "http://adaptivecards.io/schemas/adaptive-card.json";

/** The `contentType` stamped on every emitted attachment. */
export const ATTACHMENT_CONTENT_TYPE =
  "application/vnd.microsoft.card.adaptive";

/** The maximum normalized traversal depth. */
export const MAX_TRAVERSAL_DEPTH = 64;

/**
 * The maximum number of entries kept at any single level (root, or a
 * `children` array at any depth) of the raw spec, before it ever reaches
 * `normalizeSpec`. Bounds a hostile array's reported `length` so the pre-pass
 * can never be made to walk further than this regardless of what the array
 * claims about itself.
 */
export const CHILDREN_CAP = 200;

/**
 * The total number of nodes {@link boundSpec} will visit across one walk,
 * regardless of how many times a shared reference recurs. Bounds the
 * combinatorial work a DAG of shared or self-referential nodes would
 * otherwise force even though each individual array stays within
 * {@link CHILDREN_CAP}.
 */
export const NODE_BUDGET = 5000;

export type ClampReason = "children" | "budget" | "cycle" | "depth";

export function clampReasonDetail(reason: ClampReason): string {
  if (reason === "budget") {
    return `the tree was truncated after ${NODE_BUDGET} nodes.`;
  }
  if (reason === "cycle") return "a self-referencing node was dropped.";
  if (reason === "depth") {
    return `nodes deeper than ${MAX_TRAVERSAL_DEPTH} levels were dropped.`;
  }
  return `children were clamped to ${CHILDREN_CAP} entries.`;
}

/** The maximum number of attachments produced from a root-level Carousel. */
export const CAROUSEL_ATTACHMENT_CAP = 10;

/** The maximum number of primary-mode actions in one ActionSet; extras are set to secondary mode instead of being dropped. */
export const PRIMARY_ACTION_CAP = 6;

/** The maximum number of data rows in a Table. */
export const TABLE_ROW_CAP = 100;

/** The maximum number of columns in a Table. */
export const TABLE_COLUMN_CAP = 20;

/** The maximum number of choices in a Select or RadioGroup. */
export const CHOICE_OPTION_CAP = 100;

/** The soft byte-count budget for a serialized card, past which a warning notes Teams' 100 KB bot message limit (the card is never truncated to fit it). */
export const PAYLOAD_SOFT_CAP = 80000;

const textEncoder = new TextEncoder();

/** Measures the wire size of `value` in UTF-8 bytes rather than UTF-16 code units. */
export function utf8ByteLength(value: string): number {
  return textEncoder.encode(value).byteLength;
}

/** Builds the fixed-shape Adaptive Card envelope around a converted body. */
export function buildCard(body: TeamsCardElement[]): TeamsAdaptiveCard {
  return {
    $schema: ADAPTIVE_CARD_SCHEMA,
    type: "AdaptiveCard",
    version: AC_VERSION,
    body,
    actions: [],
  };
}

/** Wraps a card as a bot-framework message attachment. */
export function buildAttachment(card: TeamsAdaptiveCard): TeamsCardAttachment {
  return { contentType: ATTACHMENT_CONTENT_TYPE, content: card };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Nests an IR action under an `aui` key so `decodeSubmitData` can invert it
 * back out of the merged `activity.value` object a Teams bot receives,
 * alongside whatever other named inputs shared the card.
 */
export function buildSubmitData(action: unknown): TeamsSubmitData {
  if (!isRecord(action)) return { aui: { type: "action" } };
  const { type: rawType, ...payload } = action;
  const type = typeof rawType === "string" ? rawType : "action";
  return {
    aui: {
      type,
      ...(Object.keys(payload).length > 0 ? { payload } : {}),
    },
  };
}

/** Builds an Action.Submit carrying `action` in the `aui` envelope. */
export function buildSubmitAction(
  title: string,
  action: unknown,
  mode?: "secondary",
): TeamsSubmitAction {
  return {
    type: "Action.Submit",
    title,
    data: buildSubmitData(action),
    ...(mode !== undefined ? { mode } : {}),
  };
}
