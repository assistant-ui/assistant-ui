import {
  normalizeSpec,
  type NormalizedUIElement,
  type NormalizedUINode,
} from "../ir";
import {
  ACTION_ID_CAP,
  ACTIONS_ELEMENT_CAP,
  ALERT_TEXT_CAP,
  BUTTON_VALUE_CAP,
  CARD_ACTIONS_CAP,
  CARD_BODY_CAP,
  CARD_SUBTEXT_CAP,
  CARD_TITLE_CAP,
  CAROUSEL_CARD_CAP,
  CAROUSEL_CARD_MIN,
  CONTEXT_ELEMENT_CAP,
  CONTEXT_TEXT_CAP,
  DATA_TABLE_CHAR_BUDGET,
  DATA_TABLE_COLUMN_CAP,
  DATA_TABLE_ROW_CAP,
  FACT_FIELD_CAP,
  FACT_FIELD_TEXT_CAP,
  HEADER_TEXT_CAP,
  INPUT_LABEL_CAP,
  INTERACTIVE_TEXT_CAP,
  MARKDOWN_TEXT_BUDGET,
  MAX_TRAVERSAL_DEPTH,
  MESSAGE_BLOCK_CAP,
  MODAL_BLOCK_CAP,
  PLACEHOLDER_TEXT_CAP,
  RADIO_OPTION_CAP,
  SECTION_TEXT_CAP,
  SELECT_OPTION_CAP,
  buildAlertBlock,
  buildAlertFallback,
  buildBlockBudgetNote,
  buildCardBlock,
  buildCarouselBlock,
  buildDataTableBlock,
} from "./constants";
import type {
  SlackActionElement,
  SlackBlock,
  SlackButtonElement,
  SlackCardBlock,
  SlackConversionWarning,
  SlackDataTableCell,
  SlackImageBlock,
  SlackOption,
  SlackPlainText,
  SlackTextObject,
  SlackBlocksResult,
  ToSlackBlocksOptions,
} from "./types";

type ConversionContext = {
  readonly blockCap: number;
  readonly surface: "message" | "modal";
  readonly warnings: SlackConversionWarning[];
  markdownCharacters: number;
  markdownExhausted: boolean;
  dataTableCharacters: number;
};

const INTERACTIVE_TYPES = new Set([
  "Button",
  "Select",
  "DatePicker",
  "Checkbox",
  "RadioGroup",
]);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isElement = (node: NormalizedUINode): node is NormalizedUIElement =>
  isRecord(node);

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const warn = (
  context: ConversionContext,
  code: SlackConversionWarning["code"],
  component: string,
  detail: string,
) => {
  context.warnings.push({ code, component, detail });
};

const clampText = (
  value: string,
  cap: number,
  component: string,
  field: string,
  context: ConversionContext,
): string => {
  if (value.length <= cap) return value;
  warn(
    context,
    "clamped",
    component,
    `${field} was clamped to ${cap} characters.`,
  );
  return value.slice(0, cap);
};

const asActionId = (
  action: unknown,
  component: string,
  context: ConversionContext,
): string =>
  clampText(
    isRecord(action) && typeof action["type"] === "string"
      ? action["type"]
      : "action",
    ACTION_ID_CAP,
    component,
    "action_id",
    context,
  );

const plainText = (text: string): SlackPlainText => ({
  type: "plain_text",
  text,
});

const actionValue = (action: unknown): string | undefined => {
  if (!isRecord(action)) return undefined;
  const { type: _type, ...payload } = action;
  if (Object.keys(payload).length === 0) return undefined;
  try {
    const serialized = JSON.stringify(payload);
    return serialized === "{}" ? undefined : serialized;
  } catch {
    return undefined;
  }
};

const buttonElement = (
  label: string,
  buttonStyle: unknown,
  action: unknown,
  component: string,
  context: ConversionContext,
): SlackButtonElement => {
  const serializedValue = actionValue(action);
  let value = serializedValue;
  if (value !== undefined && value.length > BUTTON_VALUE_CAP) {
    warn(
      context,
      "dropped",
      component,
      "value was dropped because the action payload was too large to round-trip.",
    );
    value = undefined;
  }
  const style =
    buttonStyle === "primary" || buttonStyle === "danger"
      ? buttonStyle
      : undefined;
  return {
    type: "button",
    text: plainText(
      clampText(label, INTERACTIVE_TEXT_CAP, component, "label", context),
    ),
    action_id: asActionId(action, component, context),
    ...(value !== undefined ? { value } : {}),
    ...(style !== undefined ? { style } : {}),
  };
};

const optionFrom = (
  value: unknown,
  component: string,
  context: ConversionContext,
): SlackOption | undefined => {
  if (
    !isRecord(value) ||
    typeof value["label"] !== "string" ||
    typeof value["value"] !== "string"
  ) {
    return undefined;
  }
  return {
    text: plainText(
      clampText(
        value["label"],
        INTERACTIVE_TEXT_CAP,
        component,
        "option label",
        context,
      ),
    ),
    value: value["value"],
  };
};

const toActionElement = (
  element: NormalizedUIElement,
  context: ConversionContext,
): SlackActionElement | undefined => {
  const { props, action } = element;
  switch (element.type) {
    case "Button":
      return buttonElement(
        asString(props["label"]),
        props["buttonStyle"],
        action,
        "Button",
        context,
      );
    case "Select": {
      const rawOptions = Array.isArray(props["options"])
        ? props["options"]
        : [];
      if (rawOptions.length > SELECT_OPTION_CAP) {
        warn(
          context,
          "clamped",
          "Select",
          `options were clamped to ${SELECT_OPTION_CAP} entries.`,
        );
      }
      const options = rawOptions
        .slice(0, SELECT_OPTION_CAP)
        .map((option) => optionFrom(option, "Select", context))
        .filter((option): option is SlackOption => option !== undefined);
      const placeholder = clampText(
        asString(props["placeholder"]),
        PLACEHOLDER_TEXT_CAP,
        "Select",
        "placeholder",
        context,
      );
      return {
        type: "static_select",
        action_id: asActionId(action, "Select", context),
        options,
        ...(placeholder ? { placeholder: plainText(placeholder) } : {}),
      };
    }
    case "DatePicker": {
      const rawDate = asString(props["value"]);
      const initialDate = DATE_PATTERN.test(rawDate) ? rawDate : undefined;
      if (rawDate && initialDate === undefined) {
        warn(
          context,
          "dropped",
          "DatePicker",
          "value did not match the YYYY-MM-DD format and was dropped.",
        );
      }
      return {
        type: "datepicker",
        action_id: asActionId(action, "DatePicker", context),
        ...(initialDate !== undefined ? { initial_date: initialDate } : {}),
      };
    }
    case "Checkbox": {
      const label = clampText(
        asString(props["label"]),
        INTERACTIVE_TEXT_CAP,
        "Checkbox",
        "label",
        context,
      );
      const name = asString(props["name"]);
      const option: SlackOption = {
        text: plainText(label),
        value: name || label,
      };
      return {
        type: "checkboxes",
        action_id: asActionId(action, "Checkbox", context),
        options: [option],
        ...(props["defaultChecked"] === true
          ? { initial_options: [option] }
          : {}),
      };
    }
    case "RadioGroup": {
      const rawOptions = Array.isArray(props["options"])
        ? props["options"]
        : [];
      if (rawOptions.length > RADIO_OPTION_CAP) {
        warn(
          context,
          "clamped",
          "RadioGroup",
          `options were clamped to ${RADIO_OPTION_CAP} entries.`,
        );
      }
      const options = rawOptions
        .slice(0, RADIO_OPTION_CAP)
        .map((option) => optionFrom(option, "RadioGroup", context))
        .filter((option): option is SlackOption => option !== undefined);
      const selectedValue =
        typeof props["value"] === "string"
          ? props["value"]
          : asString(props["defaultValue"]);
      const initialOption = options.find(
        (option) => option.value === selectedValue,
      );
      return {
        type: "radio_buttons",
        action_id: asActionId(action, "RadioGroup", context),
        options,
        ...(initialOption !== undefined
          ? { initial_option: initialOption }
          : {}),
      };
    }
    default:
      return undefined;
  }
};

const normalizedList = (
  node: NormalizedUINode | undefined,
): NormalizedUINode[] => {
  if (node === undefined || node === null) return [];
  if (!Array.isArray(node)) return [node];
  return node.flatMap((child) => normalizedList(child));
};

const convertFacts = (
  facts: readonly NormalizedUIElement[],
  context: ConversionContext,
): SlackBlock[] => {
  const fields = facts.map((fact) => {
    const label = asString(fact.props["label"]);
    const value = asString(fact.props["value"]);
    return {
      type: "mrkdwn" as const,
      text: clampText(
        `*${label}*\n${value}`,
        FACT_FIELD_TEXT_CAP,
        "Fact",
        "field",
        context,
      ),
    };
  });
  const blocks: SlackBlock[] = [];
  for (let index = 0; index < fields.length; index += FACT_FIELD_CAP) {
    blocks.push({
      type: "section",
      fields: fields.slice(index, index + FACT_FIELD_CAP),
    });
  }
  return blocks;
};

const convertActions = (
  elements: readonly NormalizedUIElement[],
  context: ConversionContext,
): SlackBlock[] => {
  const converted = elements
    .map((element) => toActionElement(element, context))
    .filter((element): element is SlackActionElement => element !== undefined);
  const blocks: SlackBlock[] = [];
  for (let index = 0; index < converted.length; index += ACTIONS_ELEMENT_CAP) {
    blocks.push({
      type: "actions",
      elements: converted.slice(index, index + ACTIONS_ELEMENT_CAP),
    });
  }
  return blocks;
};

const cardActionButtons = (
  props: Readonly<Record<string, unknown>>,
  context: ConversionContext,
): SlackButtonElement[] => {
  const buttons: SlackButtonElement[] = [];
  for (const key of ["confirm", "cancel"] as const) {
    const footer = props[key];
    if (!isRecord(footer)) continue;
    buttons.push(
      buttonElement(
        asString(footer["label"]),
        key === "confirm" ? "primary" : undefined,
        footer["$action"],
        "Card",
        context,
      ),
    );
  }
  return buttons;
};

const cardTitleText = (
  props: Readonly<Record<string, unknown>>,
  context: ConversionContext,
): string | undefined => {
  const rawTitle = asString(props["title"]);
  return rawTitle
    ? clampText(rawTitle, CARD_TITLE_CAP, "Card", "title", context)
    : undefined;
};

const isCardNoOp = (node: NormalizedUINode): boolean =>
  isElement(node) && (node.type === "Spacer" || node.type === "Icon");

const collectText = (
  node: NormalizedUINode | undefined,
  depth: number,
): string[] => {
  if (node === undefined || node === null || depth > MAX_TRAVERSAL_DEPTH) {
    return [];
  }
  if (typeof node === "string" || typeof node === "number") {
    return [String(node)];
  }
  if (Array.isArray(node)) {
    return node.flatMap((child) => collectText(child, depth + 1));
  }
  const element = node as NormalizedUIElement;
  const own = ["text", "value", "label", "title", "description"]
    .map((key) => element.props[key])
    .filter((value): value is string => typeof value === "string");
  return [...own, ...collectText(element.children, depth + 1)];
};

type CardFields = {
  readonly heroImage: SlackImageBlock | undefined;
  readonly bodyRaw: string | undefined;
  readonly subtextRaw: string | undefined;
  readonly leftover: readonly NormalizedUINode[];
};

/**
 * Scans a card's children for the pieces the native card block shape can
 * carry (a hero image, body text, and subtext), each taken from the first
 * matching child. Anything left over means the card cannot map cleanly onto
 * the native shape.
 */
const extractCardFields = (element: NormalizedUIElement): CardFields => {
  const children = normalizedList(element.children);
  let heroImage: SlackImageBlock | undefined;
  let bodyRaw: string | undefined;
  let subtextRaw: string | undefined;
  const leftover: NormalizedUINode[] = [];
  for (const child of children) {
    if (heroImage === undefined && isElement(child) && child.type === "Image") {
      heroImage = {
        type: "image",
        image_url: asString(child.props["src"]),
        alt_text: asString(child.props["alt"]),
      };
      continue;
    }
    if (
      bodyRaw === undefined &&
      isElement(child) &&
      (child.type === "Text" || child.type === "Markdown")
    ) {
      bodyRaw = asString(child.props["value"]);
      continue;
    }
    if (
      subtextRaw === undefined &&
      isElement(child) &&
      child.type === "Caption"
    ) {
      subtextRaw = asString(child.props["value"]);
      continue;
    }
    if (isCardNoOp(child)) continue;
    leftover.push(child);
  }
  return { heroImage, bodyRaw, subtextRaw, leftover };
};

/** Assembles a native card block, clamping its body and subtext text. */
const assembleCleanCard = (
  titleText: string | undefined,
  fields: CardFields,
  buttons: readonly SlackButtonElement[],
  context: ConversionContext,
): SlackCardBlock => {
  const body: SlackTextObject | undefined =
    fields.bodyRaw !== undefined
      ? {
          type: "mrkdwn",
          text: clampText(
            fields.bodyRaw,
            CARD_BODY_CAP,
            "Card",
            "body",
            context,
          ),
        }
      : undefined;
  const subtext: SlackTextObject | undefined =
    fields.subtextRaw !== undefined
      ? {
          type: "mrkdwn",
          text: clampText(
            fields.subtextRaw,
            CARD_SUBTEXT_CAP,
            "Card",
            "subtext",
            context,
          ),
        }
      : undefined;
  if (buttons.length > CARD_ACTIONS_CAP) {
    warn(
      context,
      "clamped",
      "Card",
      `actions were clamped to ${CARD_ACTIONS_CAP} entries.`,
    );
  }
  return buildCardBlock({
    ...(fields.heroImage !== undefined ? { heroImage: fields.heroImage } : {}),
    ...(titleText !== undefined
      ? { title: { type: "mrkdwn", text: titleText } }
      : {}),
    ...(body !== undefined ? { body } : {}),
    ...(subtext !== undefined ? { subtext } : {}),
    ...(buttons.length > 0
      ? { actions: buttons.slice(0, CARD_ACTIONS_CAP) }
      : {}),
  });
};

/**
 * A card requires at least one of `hero_image`, `title`, `body`, or `actions`
 * (see {@link SlackCardBlock}); a card with none of them is not a valid
 * native block and must be dropped instead of emitted.
 */
const isEmptyCard = (card: SlackCardBlock): boolean =>
  card.hero_image === undefined &&
  card.title === undefined &&
  card.body === undefined &&
  (card.actions === undefined || card.actions.length === 0);

const convertCard = (
  element: NormalizedUIElement,
  context: ConversionContext,
  depth: number,
): SlackBlock[] => {
  const titleText = cardTitleText(element.props, context);
  const fields = extractCardFields(element);
  const buttons = cardActionButtons(element.props, context);

  if (fields.leftover.length > 0) {
    warn(
      context,
      "fallback",
      "Card",
      "A card with content beyond hero_image, body, subtext, and actions was rendered inline.",
    );
    return [
      ...(titleText
        ? [{ type: "header" as const, text: plainText(titleText) }]
        : []),
      ...convertSequence(element.children, context, depth + 1),
      ...(buttons.length > 0
        ? [{ type: "actions" as const, elements: buttons }]
        : []),
    ];
  }
  const card = assembleCleanCard(titleText, fields, buttons, context);
  if (isEmptyCard(card)) {
    warn(
      context,
      "dropped",
      "Card",
      "A card with none of hero_image, title, body, or actions was dropped.",
    );
    return [];
  }
  return [card];
};

/**
 * Degrades a card that cannot map cleanly into a title-and-body card block.
 * A carousel cannot fall back to a block sequence like a standalone card
 * can, so its content is clamped down to fit the card shape instead.
 */
const degradeCard = (
  element: NormalizedUIElement,
  context: ConversionContext,
  depth: number,
): SlackCardBlock => {
  const rawTitle = asString(element.props["title"]);
  const textChunks = collectText(element.children, depth + 1);
  const titleSource = rawTitle || textChunks[0] || "";
  const bodyChunks = rawTitle ? textChunks : textChunks.slice(1);
  const titleText = titleSource.slice(0, CARD_TITLE_CAP);
  const bodyText = bodyChunks.join("\n").slice(0, CARD_BODY_CAP);
  warn(
    context,
    "clamped",
    "Card",
    "A card inside a carousel was degraded to title and body.",
  );
  return buildCardBlock({
    ...(titleText ? { title: { type: "mrkdwn", text: titleText } } : {}),
    ...(bodyText ? { body: { type: "mrkdwn", text: bodyText } } : {}),
  });
};

const convertCarouselCard = (
  element: NormalizedUIElement,
  context: ConversionContext,
  depth: number,
): SlackCardBlock | undefined => {
  const fields = extractCardFields(element);
  const card =
    fields.leftover.length === 0
      ? assembleCleanCard(
          cardTitleText(element.props, context),
          fields,
          cardActionButtons(element.props, context),
          context,
        )
      : degradeCard(element, context, depth);
  if (isEmptyCard(card)) {
    warn(
      context,
      "dropped",
      "Card",
      "A card with none of hero_image, title, body, or actions was dropped.",
    );
    return undefined;
  }
  return card;
};

const isBadgeOrCaption = (
  node: NormalizedUINode,
): node is NormalizedUIElement =>
  isElement(node) && (node.type === "Badge" || node.type === "Caption");

const contextRow = (
  element: NormalizedUIElement,
  context: ConversionContext,
): SlackBlock[] | undefined => {
  const allChildren = normalizedList(element.children);
  const children = allChildren.filter(isBadgeOrCaption);
  if (allChildren.length === 0 || children.length !== allChildren.length) {
    return undefined;
  }
  if (children.length > CONTEXT_ELEMENT_CAP) {
    warn(
      context,
      "clamped",
      "Row",
      `context elements were clamped to ${CONTEXT_ELEMENT_CAP} entries.`,
    );
  }
  return [
    {
      type: "context",
      elements: children.slice(0, CONTEXT_ELEMENT_CAP).map((child) => ({
        type: "mrkdwn",
        text: clampText(
          asString(child.props["value"]),
          CONTEXT_TEXT_CAP,
          child.type,
          "value",
          context,
        ),
      })),
    },
  ];
};

const convertListItem = (
  element: NormalizedUIElement,
  context: ConversionContext,
  depth: number,
): SlackBlock => {
  const text = clampText(
    collectText(element.children, depth + 1).join("\n"),
    SECTION_TEXT_CAP,
    "ListViewItem",
    "text",
    context,
  );
  const accessory = isRecord(element.action)
    ? buttonElement("Open", undefined, element.action, "ListViewItem", context)
    : undefined;
  return {
    type: "section",
    text: { type: "mrkdwn", text },
    ...(accessory !== undefined ? { accessory } : {}),
  };
};

const convertListView = (
  element: NormalizedUIElement,
  context: ConversionContext,
  depth: number,
): SlackBlock[] => {
  const items = normalizedList(element.children).filter(
    (child): child is NormalizedUIElement =>
      isElement(child) && child.type === "ListViewItem",
  );
  return items.flatMap((item, index) => [
    ...(index > 0 ? [{ type: "divider" as const }] : []),
    convertListItem(item, context, depth + 1),
  ]);
};

const convertCarousel = (
  element: NormalizedUIElement,
  context: ConversionContext,
  depth: number,
): SlackBlock[] => {
  const cardChildren: NormalizedUIElement[] = [];
  for (const child of normalizedList(element.children)) {
    if (isElement(child) && child.type === "Card") {
      cardChildren.push(child);
    } else {
      warn(context, "dropped", "Carousel", "A non-card child was dropped.");
    }
  }
  if (cardChildren.length > CAROUSEL_CARD_CAP) {
    warn(
      context,
      "clamped",
      "Carousel",
      `cards were clamped to ${CAROUSEL_CARD_CAP} entries.`,
    );
  }
  const cards = cardChildren
    .slice(0, CAROUSEL_CARD_CAP)
    .map((card) => convertCarouselCard(card, context, depth + 1))
    .filter((card): card is SlackCardBlock => card !== undefined);
  if (cards.length < CAROUSEL_CARD_MIN) {
    warn(
      context,
      "dropped",
      "Carousel",
      "A carousel without renderable cards was dropped.",
    );
    return [];
  }
  return [buildCarouselBlock(cards)];
};

const toDataTableCell = (value: unknown): SlackDataTableCell | undefined => {
  if (typeof value === "number") {
    return { type: "raw_number", text: String(value) };
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return { type: "raw_text", text: String(value) };
  }
  return undefined;
};

const rowCharacters = (row: readonly SlackDataTableCell[]): number =>
  row.reduce((sum, cell) => sum + cell.text.length, 0);

const convertTable = (
  element: NormalizedUIElement,
  context: ConversionContext,
): SlackBlock[] => {
  const rawColumns = Array.isArray(element.props["columns"])
    ? element.props["columns"]
    : [];
  const rawRows = Array.isArray(element.props["rows"])
    ? element.props["rows"]
    : [];
  if (rawColumns.length > DATA_TABLE_COLUMN_CAP) {
    warn(
      context,
      "clamped",
      "Table",
      `columns were clamped to ${DATA_TABLE_COLUMN_CAP} entries.`,
    );
  }
  if (rawRows.length > DATA_TABLE_ROW_CAP) {
    warn(
      context,
      "clamped",
      "Table",
      `rows were clamped to ${DATA_TABLE_ROW_CAP} entries.`,
    );
  }

  const columnHeaderRow: SlackDataTableCell[] = rawColumns
    .slice(0, DATA_TABLE_COLUMN_CAP)
    .filter(isRecord)
    .map((column) => ({
      type: "raw_text" as const,
      text: asString(column["label"]),
    }));
  const dataRows: SlackDataTableCell[][] = rawRows
    .slice(0, DATA_TABLE_ROW_CAP)
    .map((row) =>
      (Array.isArray(row) ? row : [])
        .slice(0, DATA_TABLE_COLUMN_CAP)
        .map(
          (value) =>
            toDataTableCell(value) ?? { type: "raw_text" as const, text: "" },
        ),
    );
  const width = Math.max(
    columnHeaderRow.length,
    0,
    ...dataRows.map((row) => row.length),
  );
  const padRow = (row: SlackDataTableCell[]): SlackDataTableCell[] =>
    row.length >= width
      ? row
      : [
          ...row,
          ...Array.from({ length: width - row.length }, () => ({
            type: "raw_text" as const,
            text: "",
          })),
        ];
  const headerRow = padRow(columnHeaderRow);

  const headerCharacters = rowCharacters(headerRow);
  if (context.dataTableCharacters + headerCharacters > DATA_TABLE_CHAR_BUDGET) {
    warn(
      context,
      "dropped",
      "Table",
      `the table was dropped because its header row exceeds the ${DATA_TABLE_CHAR_BUDGET}-character table budget.`,
    );
    return [];
  }

  const kept: SlackDataTableCell[][] = [headerRow];
  let tableCharacters = headerCharacters;
  let budgetClamped = false;
  for (const row of dataRows.map(padRow)) {
    const chars = rowCharacters(row);
    if (
      context.dataTableCharacters + tableCharacters + chars >
      DATA_TABLE_CHAR_BUDGET
    ) {
      budgetClamped = true;
      break;
    }
    kept.push(row);
    tableCharacters += chars;
  }
  context.dataTableCharacters += tableCharacters;
  if (budgetClamped) {
    warn(
      context,
      "clamped",
      "Table",
      `rows were clamped to fit the ${DATA_TABLE_CHAR_BUDGET}-character table budget.`,
    );
  }

  return [buildDataTableBlock(kept)];
};

const convertElement = (
  element: NormalizedUIElement,
  context: ConversionContext,
  depth: number,
): SlackBlock[] => {
  const { props } = element;
  switch (element.type) {
    case "Header":
      return [
        {
          type: "header",
          text: plainText(
            clampText(
              asString(props["text"]),
              HEADER_TEXT_CAP,
              "Header",
              "text",
              context,
            ),
          ),
        },
      ];
    case "Text":
      return [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: clampText(
              asString(props["value"]),
              SECTION_TEXT_CAP,
              "Text",
              "value",
              context,
            ),
          },
        },
      ];
    case "Caption":
    case "Badge":
      return [
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: clampText(
                asString(props["value"]),
                CONTEXT_TEXT_CAP,
                element.type,
                "value",
                context,
              ),
            },
          ],
        },
      ];
    case "Fact":
      return convertFacts([element], context);
    case "Image":
      return [
        {
          type: "image",
          image_url: asString(props["src"]),
          alt_text: asString(props["alt"]),
        },
      ];
    case "Divider":
      return [{ type: "divider" }];
    case "Button":
    case "Select":
    case "DatePicker":
    case "Checkbox":
    case "RadioGroup":
      return convertActions([element], context);
    case "Input": {
      const label = clampText(
        asString(props["label"]),
        INPUT_LABEL_CAP,
        "Input",
        "label",
        context,
      );
      const placeholder = clampText(
        asString(props["placeholder"]),
        PLACEHOLDER_TEXT_CAP,
        "Input",
        "placeholder",
        context,
      );
      return [
        {
          type: "input",
          label: plainText(label),
          element: {
            type: "plain_text_input",
            action_id: asActionId(element.action, "Input", context),
            ...(props["multiline"] === true ? { multiline: true } : {}),
            ...(placeholder ? { placeholder: plainText(placeholder) } : {}),
          },
        },
      ];
    }
    case "Alert": {
      const tone =
        props["tone"] === "success" ||
        props["tone"] === "warning" ||
        props["tone"] === "danger"
          ? props["tone"]
          : "info";
      const titleText = asString(props["title"]);
      const description = asString(props["description"]);
      if (context.surface === "modal") {
        const combined = [titleText, description].filter(Boolean).join("\n");
        return [
          buildAlertBlock(
            clampText(combined, ALERT_TEXT_CAP, "Alert", "text", context),
            tone,
          ),
        ];
      }
      warn(
        context,
        "fallback",
        "Alert",
        "Alert was rendered with message-surface fallback blocks.",
      );
      return [
        ...buildAlertFallback(
          titleText,
          clampText(
            description,
            SECTION_TEXT_CAP,
            "Alert",
            "description",
            context,
          ),
          tone,
        ),
      ];
    }
    case "Card":
      return convertCard(element, context, depth);
    case "Carousel":
      return convertCarousel(element, context, depth);
    case "Col":
    case "Box":
      return convertSequence(element.children, context, depth + 1);
    case "Row":
      return (
        contextRow(element, context) ??
        convertSequence(element.children, context, depth + 1)
      );
    case "Spacer":
    case "Icon":
      return [];
    case "Table":
      return convertTable(element, context);
    case "Markdown": {
      const value = asString(props["value"]);
      if (
        !context.markdownExhausted &&
        context.markdownCharacters + value.length <= MARKDOWN_TEXT_BUDGET
      ) {
        context.markdownCharacters += value.length;
        return [{ type: "markdown", text: value }];
      }
      context.markdownExhausted = true;
      warn(
        context,
        "fallback",
        "Markdown",
        `The ${MARKDOWN_TEXT_BUDGET}-character markdown budget was exceeded.`,
      );
      return [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: clampText(
              value,
              SECTION_TEXT_CAP,
              "Markdown",
              "fallback text",
              context,
            ),
          },
        },
      ];
    }
    case "Chart":
      warn(
        context,
        "dropped",
        "Chart",
        "Chart was replaced by a Slack omission note.",
      );
      return [
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: "Chart omitted on Slack." }],
        },
      ];
    case "ListView":
      return convertListView(element, context, depth);
    case "ListViewItem":
      return [convertListItem(element, context, depth)];
    case "Form":
      return [
        ...convertSequence(element.children, context, depth + 1),
        {
          type: "actions",
          elements: [
            buttonElement("Submit", "primary", element.action, "Form", context),
          ],
        },
      ];
    default:
      warn(
        context,
        "dropped",
        element.type,
        "Unknown component type was dropped.",
      );
      return [];
  }
};

function convertSequence(
  node: NormalizedUINode | undefined,
  context: ConversionContext,
  depth: number,
): SlackBlock[] {
  if (node === undefined || node === null || depth > MAX_TRAVERSAL_DEPTH) {
    return [];
  }
  const nodes = Array.isArray(node) ? node : [node];
  const blocks: SlackBlock[] = [];
  for (let index = 0; index < nodes.length; ) {
    const current = nodes[index];
    if (current === undefined || current === null) {
      index += 1;
      continue;
    }
    if (isElement(current) && current.type === "Fact") {
      const facts: NormalizedUIElement[] = [];
      while (index < nodes.length) {
        const candidate = nodes[index];
        if (!candidate || !isElement(candidate) || candidate.type !== "Fact") {
          break;
        }
        facts.push(candidate);
        index += 1;
      }
      blocks.push(...convertFacts(facts, context));
      continue;
    }
    if (isElement(current) && INTERACTIVE_TYPES.has(current.type)) {
      const controls: NormalizedUIElement[] = [];
      while (index < nodes.length) {
        const candidate = nodes[index];
        if (
          !candidate ||
          !isElement(candidate) ||
          !INTERACTIVE_TYPES.has(candidate.type)
        ) {
          break;
        }
        controls.push(candidate);
        index += 1;
      }
      blocks.push(...convertActions(controls, context));
      continue;
    }
    if (typeof current === "string" || typeof current === "number") {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: clampText(
            String(current),
            SECTION_TEXT_CAP,
            "Text",
            "value",
            context,
          ),
        },
      });
    } else if (Array.isArray(current)) {
      blocks.push(...convertSequence(current, context, depth + 1));
    } else {
      blocks.push(
        ...convertElement(current as NormalizedUIElement, context, depth + 1),
      );
    }
    index += 1;
  }
  return blocks;
}

/** Converts a generative-UI tree into Slack Block Kit JSON and downgrade warnings. */
export function toSlackBlocks(
  node: unknown,
  options?: ToSlackBlocksOptions,
): SlackBlocksResult {
  const surface = options?.surface === "modal" ? "modal" : "message";
  const context: ConversionContext = {
    blockCap: surface === "modal" ? MODAL_BLOCK_CAP : MESSAGE_BLOCK_CAP,
    surface,
    warnings: [],
    markdownCharacters: 0,
    markdownExhausted: false,
    dataTableCharacters: 0,
  };
  try {
    const { root } = normalizeSpec(node as never);
    const converted = convertSequence(root, context, 0);
    if (converted.length <= context.blockCap) {
      return { blocks: converted, warnings: context.warnings };
    }
    const kept = converted.slice(0, context.blockCap - 1);
    const omitted = converted.length - kept.length;
    warn(
      context,
      "clamped",
      "Root",
      `${omitted} ${omitted === 1 ? "block was" : "blocks were"} omitted.`,
    );
    return {
      blocks: [...kept, buildBlockBudgetNote(omitted)],
      warnings: context.warnings,
    };
  } catch {
    return {
      blocks: [],
      warnings: [
        {
          code: "dropped",
          component: "Root",
          detail: "Input could not be converted.",
        },
      ],
    };
  }
}
