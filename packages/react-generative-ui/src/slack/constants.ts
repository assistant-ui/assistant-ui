import type {
  SlackAlertBlock,
  SlackButtonElement,
  SlackCardBlock,
  SlackCarouselBlock,
  SlackContextBlock,
  SlackDataTableBlock,
  SlackDataTableCell,
  SlackImageBlock,
  SlackSectionBlock,
  SlackTextObject,
} from "./types";

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
 * The total number of nodes the pre-normalization bounding walk will visit
 * across one call, regardless of how many times a shared reference recurs.
 * Bounds the combinatorial work a DAG of shared or self-referential nodes
 * would otherwise force even though each individual array stays within
 * {@link CHILDREN_CAP}.
 */
export const NODE_BUDGET = 5000;

/** The block limit for a Slack message. */
export const MESSAGE_BLOCK_CAP = 50;

/** The block limit for a Slack modal. */
export const MODAL_BLOCK_CAP = 100;

/**
 * The maximum number of top-level blocks accepted when parsing Slack Block
 * Kit JSON back into generative UI, guarding against a hostile or malformed
 * payload.
 */
export const INBOUND_BLOCK_CAP = 200;

/** The character limit for header text. */
export const HEADER_TEXT_CAP = 150;

/** The character limit for section text. */
export const SECTION_TEXT_CAP = 3000;

/** The maximum number of fields in one section. */
export const FACT_FIELD_CAP = 10;

/** The character limit for one section field. */
export const FACT_FIELD_TEXT_CAP = 2000;

/** The character limit for button labels and option labels. */
export const INTERACTIVE_TEXT_CAP = 75;

/** The character limit for an action_id. */
export const ACTION_ID_CAP = 255;

/** The character limit for a button's serialized value payload. */
export const BUTTON_VALUE_CAP = 2000;

/** The maximum number of elements in one actions block. */
export const ACTIONS_ELEMENT_CAP = 25;

/** The maximum number of options in a static select. */
export const SELECT_OPTION_CAP = 100;

/** The maximum number of options in a radio-button group. */
export const RADIO_OPTION_CAP = 10;

/** The character limit for a select or input placeholder. */
export const PLACEHOLDER_TEXT_CAP = 150;

/** The character limit for an input's label. */
export const INPUT_LABEL_CAP = 2000;

/** The maximum number of elements in one context block. */
export const CONTEXT_ELEMENT_CAP = 10;

/** The character limit for one context element's text. */
export const CONTEXT_TEXT_CAP = 3000;

/** The character limit for card titles and subtitles. */
export const CARD_TITLE_CAP = 150;

/** The character limit for a card's body text. */
export const CARD_BODY_CAP = 200;

/** The character limit for a card's subtext. */
export const CARD_SUBTEXT_CAP = 200;

/** The maximum number of buttons in a card's actions. */
export const CARD_ACTIONS_CAP = 3;

/** The minimum number of elements in a renderable carousel. */
export const CAROUSEL_CARD_MIN = 1;

/** The maximum number of elements in a carousel. */
export const CAROUSEL_CARD_CAP = 10;

/** The character limit for an alert's text. */
export const ALERT_TEXT_CAP = 200;

/**
 * The maximum number of data rows in a data-table block; the emitted `rows`
 * array additionally carries one header row.
 */
export const DATA_TABLE_ROW_CAP = 100;

/** The maximum number of columns in a data-table block. */
export const DATA_TABLE_COLUMN_CAP = 20;

/**
 * The cumulative character limit (summed across every cell's text) shared by
 * every data-table block in one payload.
 */
export const DATA_TABLE_CHAR_BUDGET = 10000;

/** The caption emitted on every native data-table block. */
export const TABLE_CAPTION = "Table";

/** The cumulative character limit for native markdown blocks. */
export const MARKDOWN_TEXT_BUDGET = 12000;

/** Builds the message-surface fallback for an alert. */
export function buildAlertFallback(
  title: string,
  description: string,
  tone: "info" | "success" | "warning" | "danger",
): readonly [SlackContextBlock, SlackSectionBlock] {
  const emoji = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    danger: "🛑",
  }[tone];
  return [
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: title ? `${emoji} *${title}*` : emoji },
      ],
    },
    { type: "section", text: { type: "mrkdwn", text: description } },
  ];
}

/** Builds a 2026 Slack modal-only alert block, mapping `tone` to its `level`. */
export function buildAlertBlock(
  text: string,
  tone: "info" | "success" | "warning" | "danger",
): SlackAlertBlock {
  const level = {
    info: "info",
    success: "success",
    warning: "warning",
    danger: "error",
  }[tone] as const;
  return { type: "alert", text: { type: "mrkdwn", text }, level };
}

type CardBlockFields = {
  readonly heroImage?: SlackImageBlock;
  readonly title?: SlackTextObject;
  readonly subtitle?: SlackTextObject;
  readonly body?: SlackTextObject;
  readonly subtext?: SlackTextObject;
  readonly actions?: readonly SlackButtonElement[];
};

/** Builds a 2026 Slack card block from its already-clamped fields. */
export function buildCardBlock(fields: CardBlockFields): SlackCardBlock {
  const { heroImage, title, subtitle, body, subtext, actions } = fields;
  return {
    type: "card",
    ...(heroImage !== undefined ? { hero_image: heroImage } : {}),
    ...(title !== undefined ? { title } : {}),
    ...(subtitle !== undefined ? { subtitle } : {}),
    ...(body !== undefined ? { body } : {}),
    ...(subtext !== undefined ? { subtext } : {}),
    ...(actions !== undefined ? { actions } : {}),
  };
}

/** Builds a 2026 Slack carousel block. */
export function buildCarouselBlock(
  elements: readonly SlackCardBlock[],
): SlackCarouselBlock {
  return { type: "carousel", elements };
}

/** Builds a 2026 Slack data-table block; `rows[0]` must be the header row. */
export function buildDataTableBlock(
  rows: readonly (readonly SlackDataTableCell[])[],
): SlackDataTableBlock {
  return { type: "data_table", caption: TABLE_CAPTION, rows };
}

/** Builds the final note used when a surface block budget is exceeded. */
export function buildBlockBudgetNote(omitted: number): SlackContextBlock {
  return {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `${omitted} ${omitted === 1 ? "block was" : "blocks were"} omitted.`,
      },
    ],
  };
}
