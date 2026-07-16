import type { Action, UIElement } from "../ir";
import {
  ACTIONS_ELEMENT_CAP,
  CARD_ACTIONS_CAP,
  CAROUSEL_CARD_CAP,
  CONTEXT_ELEMENT_CAP,
  DATA_TABLE_COLUMN_CAP,
  DATA_TABLE_ROW_CAP,
  FACT_FIELD_CAP,
  INBOUND_BLOCK_CAP,
  RADIO_OPTION_CAP,
  SELECT_OPTION_CAP,
} from "./constants";
import type { FromSlackBlocksResult, SlackConversionWarning } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const textOf = (value: unknown): string =>
  isRecord(value) && typeof value["text"] === "string" ? value["text"] : "";

const warn = (
  warnings: SlackConversionWarning[],
  code: SlackConversionWarning["code"],
  component: string,
  detail: string,
) => {
  warnings.push({ code, component, detail });
};

/**
 * The shared bounded-iteration primitive: slices `value` to `cap` entries
 * without ever reading past that many indices, so a hostile array (sparse or
 * proxied with a fabricated `length`) cannot stall the event loop. `slice`
 * itself performs the bounded read; only its own reported length is
 * inspected to detect truncation.
 */
const clampArray = (
  value: unknown,
  cap: number,
): { readonly items: unknown[]; readonly truncated: boolean } => {
  if (!Array.isArray(value)) return { items: [], truncated: false };
  return { items: value.slice(0, cap), truncated: value.length > cap };
};

const boundedArray = (
  value: unknown,
  cap: number,
  warnings: SlackConversionWarning[],
  component: string,
  detail: string,
): unknown[] => {
  const { items, truncated } = clampArray(value, cap);
  if (truncated) warn(warnings, "clamped", component, detail);
  return items;
};

const parseValuePayload = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "string") return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const decodeAction = (actionId: unknown, value: unknown): Action => ({
  ...parseValuePayload(value),
  type: typeof actionId === "string" ? actionId : "action",
});

const headerFrom = (block: Record<string, unknown>): UIElement => ({
  $type: "Header",
  text: textOf(block["text"]),
});

const imageFrom = (block: Record<string, unknown>): UIElement => ({
  $type: "Image",
  src: asString(block["image_url"]),
  alt: asString(block["alt_text"]),
});

const markdownFrom = (block: Record<string, unknown>): UIElement => ({
  $type: "Markdown",
  value: asString(block["text"]),
});

const FACT_FIELD_PATTERN = /^\*([\s\S]*?)\*\n([\s\S]*)$/;

const factFrom = (
  field: unknown,
  warnings: SlackConversionWarning[],
): UIElement => {
  const text = textOf(field);
  const match = FACT_FIELD_PATTERN.exec(text);
  if (match) {
    const [, label, value] = match;
    return { $type: "Fact", label, value };
  }
  warn(
    warnings,
    "fallback",
    "Fact",
    "A section field that did not match the label/value format was kept as a value-only fact.",
  );
  return { $type: "Fact", label: "", value: text };
};

const listViewItemFrom = (
  text: string,
  button: Record<string, unknown>,
): UIElement => ({
  $type: "ListViewItem",
  $action: decodeAction(button["action_id"], button["value"]),
  children: { $type: "Text", value: text },
});

/**
 * Recognizes a section block that stands for a `ListViewItem`: mrkdwn text
 * paired with a button accessory, and no `fields` (a fields section is
 * always a Facts section, never a list row).
 */
const listViewItemFromSection = (block: unknown): UIElement | undefined => {
  if (!isRecord(block) || block["type"] !== "section") return undefined;
  if (Array.isArray(block["fields"])) return undefined;
  const accessory = block["accessory"];
  if (!isRecord(accessory) || accessory["type"] !== "button") {
    return undefined;
  }
  return listViewItemFrom(textOf(block["text"]), accessory);
};

const isDividerBlock = (block: unknown): boolean =>
  isRecord(block) && block["type"] === "divider";

const sectionFrom = (
  block: Record<string, unknown>,
  warnings: SlackConversionWarning[],
): UIElement[] => {
  const fields = block["fields"];
  if (Array.isArray(fields)) {
    return boundedArray(
      fields,
      FACT_FIELD_CAP,
      warnings,
      "Fact",
      `fields were clamped to ${FACT_FIELD_CAP} entries.`,
    ).map((field) => factFrom(field, warnings));
  }
  return [{ $type: "Text", value: textOf(block["text"]) }];
};

const captionFrom = (element: unknown): UIElement => ({
  $type: "Caption",
  value: textOf(element),
});

const contextFrom = (
  block: Record<string, unknown>,
  warnings: SlackConversionWarning[],
): UIElement => {
  const elements = boundedArray(
    block["elements"],
    CONTEXT_ELEMENT_CAP,
    warnings,
    "Row",
    `elements were clamped to ${CONTEXT_ELEMENT_CAP} entries.`,
  );
  if (elements.length > 1) {
    return { $type: "Row", children: elements.map(captionFrom) };
  }
  return {
    $type: "Caption",
    value: elements.length === 1 ? textOf(elements[0]) : "",
  };
};

const optionFrom = (
  option: unknown,
): { label: string; value: string } | undefined => {
  if (!isRecord(option) || typeof option["value"] !== "string") {
    return undefined;
  }
  return { label: textOf(option["text"]), value: option["value"] };
};

const buttonFrom = (element: Record<string, unknown>): UIElement => {
  const style = element["style"];
  return {
    $type: "Button",
    label: textOf(element["text"]),
    ...(style === "primary" || style === "danger"
      ? { buttonStyle: style }
      : {}),
    $action: decodeAction(element["action_id"], element["value"]),
  };
};

const selectFrom = (
  element: Record<string, unknown>,
  warnings: SlackConversionWarning[],
): UIElement => {
  const options = boundedArray(
    element["options"],
    SELECT_OPTION_CAP,
    warnings,
    "Select",
    `options were clamped to ${SELECT_OPTION_CAP} entries.`,
  );
  const placeholder = element["placeholder"];
  return {
    $type: "Select",
    options: options.map(optionFrom).filter(isDefined),
    ...(isRecord(placeholder) ? { placeholder: textOf(placeholder) } : {}),
    $action: decodeAction(element["action_id"], element["value"]),
  };
};

const datePickerFrom = (element: Record<string, unknown>): UIElement => ({
  $type: "DatePicker",
  ...(typeof element["initial_date"] === "string"
    ? { value: element["initial_date"] }
    : {}),
  $action: decodeAction(element["action_id"], element["value"]),
});

const checkboxFrom = (element: Record<string, unknown>): UIElement => {
  const options = Array.isArray(element["options"]) ? element["options"] : [];
  const first = options[0];
  const initialOptions = Array.isArray(element["initial_options"])
    ? element["initial_options"]
    : [];
  const firstValue =
    isRecord(first) && typeof first["value"] === "string" ? first["value"] : "";
  const firstChecked = initialOptions.some(
    (option) => isRecord(option) && option["value"] === firstValue,
  );
  return {
    $type: "Checkbox",
    label: isRecord(first) ? textOf(first["text"]) : "",
    name: firstValue,
    ...(firstChecked ? { defaultChecked: true } : {}),
    $action: decodeAction(element["action_id"], element["value"]),
  };
};

const radioGroupFrom = (
  element: Record<string, unknown>,
  warnings: SlackConversionWarning[],
): UIElement => {
  const options = boundedArray(
    element["options"],
    RADIO_OPTION_CAP,
    warnings,
    "RadioGroup",
    `options were clamped to ${RADIO_OPTION_CAP} entries.`,
  );
  const initialOption = element["initial_option"];
  const initialValue =
    isRecord(initialOption) && typeof initialOption["value"] === "string"
      ? initialOption["value"]
      : undefined;
  return {
    $type: "RadioGroup",
    options: options.map(optionFrom).filter(isDefined),
    ...(initialValue !== undefined ? { defaultValue: initialValue } : {}),
    $action: decodeAction(element["action_id"], element["value"]),
  };
};

const actionElementFrom = (
  element: unknown,
  warnings: SlackConversionWarning[],
): UIElement | undefined => {
  if (isRecord(element)) {
    switch (element["type"]) {
      case "button":
        return buttonFrom(element);
      case "static_select":
        return selectFrom(element, warnings);
      case "datepicker":
        return datePickerFrom(element);
      case "checkboxes":
        return checkboxFrom(element);
      case "radio_buttons":
        return radioGroupFrom(element, warnings);
    }
  }
  warn(
    warnings,
    "dropped",
    isRecord(element) && typeof element["type"] === "string"
      ? element["type"]
      : "unknown",
    "Unknown action element type was dropped.",
  );
  return undefined;
};

const actionsFrom = (
  block: Record<string, unknown>,
  warnings: SlackConversionWarning[],
): UIElement[] => {
  const elements = boundedArray(
    block["elements"],
    ACTIONS_ELEMENT_CAP,
    warnings,
    "Actions",
    `elements were clamped to ${ACTIONS_ELEMENT_CAP} entries.`,
  );
  return elements
    .map((element) => actionElementFrom(element, warnings))
    .filter(isDefined);
};

const inputFrom = (
  block: Record<string, unknown>,
  warnings: SlackConversionWarning[],
): UIElement[] => {
  const element = block["element"];
  if (!isRecord(element) || element["type"] !== "plain_text_input") {
    warn(
      warnings,
      "dropped",
      "Input",
      "Unknown input element type was dropped.",
    );
    return [];
  }
  const placeholder = element["placeholder"];
  return [
    {
      $type: "Input",
      label: textOf(block["label"]),
      ...(isRecord(placeholder) ? { placeholder: textOf(placeholder) } : {}),
      ...(element["multiline"] === true ? { multiline: true } : {}),
      $action: decodeAction(element["action_id"], undefined),
    },
  ];
};

type CardFooterButton = { readonly label: string; readonly $action: Action };

const cardFooterButtonFrom = (button: unknown): CardFooterButton | undefined =>
  isRecord(button)
    ? {
        label: textOf(button["text"]),
        $action: decodeAction(button["action_id"], button["value"]),
      }
    : undefined;

/**
 * Assigns a card's footer actions by style rather than position: the
 * primary-styled button is the confirm action and a non-primary button is
 * cancel, since that is the pairing {@link toSlackBlocks} itself emits.
 * Position is only a fallback for input that does not carry that pairing
 * (zero or multiple primary-styled buttons among two or more actions).
 */
const assignCardFooterActions = (
  actions: unknown[],
  warnings: SlackConversionWarning[],
): {
  readonly confirm: CardFooterButton | undefined;
  readonly cancel: CardFooterButton | undefined;
  readonly leftover: unknown[];
} => {
  const isPrimaryButton = (action: unknown): boolean =>
    isRecord(action) && action["style"] === "primary";
  const primaryButtons = actions.filter(isPrimaryButton);

  let confirmSource: unknown = undefined;
  let cancelSource: unknown = undefined;
  let leftover: unknown[] = [];

  if (primaryButtons.length === 1) {
    const [confirmButton] = primaryButtons;
    const [cancelButton, ...rest] = actions.filter(
      (action) => !isPrimaryButton(action),
    );
    confirmSource = confirmButton;
    cancelSource = cancelButton;
    leftover = rest;
  } else if (primaryButtons.length === 0 && actions.length <= 1) {
    const [onlyButton] = actions;
    cancelSource = onlyButton;
  } else if (actions.length > 0) {
    const [first, second, ...rest] = actions;
    confirmSource = first;
    cancelSource = second;
    leftover = rest;
    warn(
      warnings,
      "fallback",
      "Card",
      "Confirm and cancel buttons could not be assigned by style and fell back to position.",
    );
  }

  return {
    confirm: cardFooterButtonFrom(confirmSource),
    cancel: cardFooterButtonFrom(cancelSource),
    leftover,
  };
};

const cardFrom = (
  block: Record<string, unknown>,
  warnings: SlackConversionWarning[],
): UIElement => {
  const titleText = textOf(block["title"]);
  const children: UIElement[] = [];
  const heroImage = block["hero_image"];
  if (isRecord(heroImage)) {
    children.push({
      $type: "Image",
      src: asString(heroImage["image_url"]),
      alt: asString(heroImage["alt_text"]),
    });
  }
  const body = block["body"];
  if (isRecord(body)) {
    children.push({ $type: "Text", value: textOf(body) });
  }
  const subtext = block["subtext"];
  if (isRecord(subtext)) {
    children.push({ $type: "Caption", value: textOf(subtext) });
  }
  const actions = boundedArray(
    block["actions"],
    CARD_ACTIONS_CAP,
    warnings,
    "Card",
    `actions were clamped to ${CARD_ACTIONS_CAP} entries.`,
  );
  const { confirm, cancel, leftover } = assignCardFooterActions(
    actions,
    warnings,
  );
  if (leftover.length > 0) {
    for (const extra of leftover) {
      if (isRecord(extra)) children.push(buttonFrom(extra));
    }
    warn(
      warnings,
      "fallback",
      "Card",
      "Card actions beyond confirm and cancel were appended as Button children.",
    );
  }
  return {
    $type: "Card",
    ...(titleText ? { title: titleText } : {}),
    ...(children.length > 0 ? { children } : {}),
    ...(confirm !== undefined ? { confirm } : {}),
    ...(cancel !== undefined ? { cancel } : {}),
  };
};

const carouselFrom = (
  block: Record<string, unknown>,
  warnings: SlackConversionWarning[],
): UIElement => {
  const elements = boundedArray(
    block["elements"],
    CAROUSEL_CARD_CAP,
    warnings,
    "Carousel",
    `cards were clamped to ${CAROUSEL_CARD_CAP} entries.`,
  );
  const cards = elements
    .filter(isRecord)
    .map((card) => cardFrom(card, warnings));
  return { $type: "Carousel", children: cards };
};

const ALERT_LEVEL_TONES: Record<string, string> = {
  error: "danger",
  success: "success",
  warning: "warning",
  info: "info",
};

const alertFrom = (block: Record<string, unknown>): UIElement => {
  const level = block["level"];
  const tone = typeof level === "string" ? ALERT_LEVEL_TONES[level] : undefined;
  return {
    $type: "Alert",
    description: textOf(block["text"]),
    ...(tone !== undefined ? { tone } : {}),
  };
};

const dataTableCellValue = (cell: unknown): string | number => {
  if (!isRecord(cell)) return "";
  const text = asString(cell["text"]);
  if (cell["type"] === "raw_number") {
    const parsed = Number(text);
    if (Number.isFinite(parsed)) return parsed;
  }
  return text;
};

const dataTableFrom = (
  block: Record<string, unknown>,
  warnings: SlackConversionWarning[],
): UIElement => {
  const { items: rows, truncated: rowsTruncated } = clampArray(
    block["rows"],
    DATA_TABLE_ROW_CAP + 1,
  );
  if (rowsTruncated) {
    warn(
      warnings,
      "clamped",
      "Table",
      `rows were clamped to ${DATA_TABLE_ROW_CAP} entries.`,
    );
  }
  const [headerRow, ...dataRows] = rows;
  const { items: headerCells, truncated: headerTruncated } = clampArray(
    headerRow,
    DATA_TABLE_COLUMN_CAP,
  );
  let columnsTruncated = headerTruncated;
  const normalizedRows = dataRows.map((row) => {
    const { items: cells, truncated } = clampArray(row, DATA_TABLE_COLUMN_CAP);
    if (truncated) columnsTruncated = true;
    return cells;
  });
  if (columnsTruncated) {
    warn(
      warnings,
      "clamped",
      "Table",
      `columns were clamped to ${DATA_TABLE_COLUMN_CAP} entries.`,
    );
  }
  const headerAllEmpty = headerCells.every(
    (cell) => !isRecord(cell) || asString(cell["text"]) === "",
  );
  const columns = headerCells.map((cell) => ({
    label: isRecord(cell) ? asString(cell["text"]) : "",
  }));
  return {
    $type: "Table",
    ...(headerAllEmpty ? {} : { columns }),
    rows: normalizedRows.map((row) => row.map(dataTableCellValue)),
  };
};

function convertBlock(
  block: unknown,
  warnings: SlackConversionWarning[],
): UIElement[] {
  if (isRecord(block)) {
    switch (block["type"]) {
      case "header":
        return [headerFrom(block)];
      case "section":
        return sectionFrom(block, warnings);
      case "context":
        return [contextFrom(block, warnings)];
      case "image":
        return [imageFrom(block)];
      case "divider":
        return [{ $type: "Divider" }];
      case "actions":
        return actionsFrom(block, warnings);
      case "input":
        return inputFrom(block, warnings);
      case "markdown":
        return [markdownFrom(block)];
      case "card":
        return [cardFrom(block, warnings)];
      case "carousel":
        return [carouselFrom(block, warnings)];
      case "alert":
        return [alertFrom(block)];
      case "data_table":
        return [dataTableFrom(block, warnings)];
    }
  }
  warn(
    warnings,
    "dropped",
    isRecord(block) && typeof block["type"] === "string"
      ? block["type"]
      : "unknown",
    "Unknown block type was dropped.",
  );
  return [];
}

const extractBlockList = (input: unknown): unknown[] | undefined => {
  if (Array.isArray(input)) return input;
  if (isRecord(input) && Array.isArray(input["blocks"])) return input["blocks"];
  return undefined;
};

/**
 * Walks the (already bounded) block list, folding a run of one or more
 * consecutive `ListViewItem`-shaped section blocks, optionally separated by
 * single divider blocks, into one `ListView` container instead of emitting
 * root-level `ListViewItem` nodes or the interleaved dividers. A divider that
 * is not directly between two such items is left for {@link convertBlock} to
 * decode as a literal `Divider`.
 */
function convertBlockList(
  blocks: unknown[],
  warnings: SlackConversionWarning[],
): UIElement[] {
  const nodes: UIElement[] = [];
  let index = 0;
  while (index < blocks.length) {
    const firstItem = listViewItemFromSection(blocks[index]);
    if (firstItem === undefined) {
      nodes.push(...convertBlock(blocks[index], warnings));
      index += 1;
      continue;
    }
    const items: UIElement[] = [firstItem];
    let cursor = index + 1;
    while (true) {
      if (isDividerBlock(blocks[cursor])) {
        const candidate = listViewItemFromSection(blocks[cursor + 1]);
        if (candidate === undefined) break;
        items.push(candidate);
        cursor += 2;
        continue;
      }
      const candidate = listViewItemFromSection(blocks[cursor]);
      if (candidate === undefined) break;
      items.push(candidate);
      cursor += 1;
    }
    nodes.push({ $type: "ListView", children: items });
    index = cursor;
  }
  return nodes;
}

/**
 * Converts Slack Block Kit JSON back into a generative-ui IR tree, inverting
 * {@link toSlackBlocks}. Accepts a blocks array or a `{ blocks }` wrapper;
 * malformed input resolves to an empty node list plus a warning, and an
 * unrecognized block or action element is skipped with a "dropped" warning.
 * Every array read along the way (blocks, fields, options, elements, cards,
 * rows, cells) is bounded to its site's cap before it is mapped over, so a
 * hostile array (sparse or proxied with a fabricated `length`) is clamped
 * with a "clamped" warning instead of stalling the event loop. Never throws.
 *
 * The Slack shape is lossier than the IR, so some information cannot be
 * recovered: a context block's elements always decode as `Caption` (the
 * original `Badge` vs `Caption` distinction does not survive the round trip),
 * a button's `buttonStyle` is only recovered for the `primary`/`danger` Slack
 * styles, a native alert block's `title` and `description` merge into a
 * single `description` string, and a card's layout collapses to its `title`,
 * a flat `children` list (image, then text, then caption, in that order),
 * and `confirm`/`cancel` footer buttons. A section field's label and value
 * are split on the first `*`+newline delimiter, so a label or value that
 * itself contains that exact delimiter cannot be split back unambiguously.
 * A data-table cell that Slack carries as `raw_text` always decodes as a
 * string, even when its text is the stringified form of a boolean, since the
 * Slack shape does not distinguish a boolean from ordinary text.
 */
export function fromSlackBlocks(blocks: unknown): FromSlackBlocksResult {
  const warnings: SlackConversionWarning[] = [];
  try {
    const list = extractBlockList(blocks);
    if (list === undefined) {
      return {
        nodes: [],
        warnings: [
          {
            code: "dropped",
            component: "Root",
            detail: "Input could not be converted.",
          },
        ],
      };
    }
    const boundedList = boundedArray(
      list,
      INBOUND_BLOCK_CAP,
      warnings,
      "Root",
      `blocks were clamped to ${INBOUND_BLOCK_CAP} entries.`,
    );
    const nodes = convertBlockList(boundedList, warnings);
    return { nodes, warnings };
  } catch {
    return {
      nodes: [],
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
