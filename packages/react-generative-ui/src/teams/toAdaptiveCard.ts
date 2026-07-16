import {
  normalizeSpec,
  type NormalizedUIElement,
  type NormalizedUINode,
} from "../ir";
import { boundSpec } from "./boundSpec";
import {
  CHILDREN_CAP,
  CHOICE_OPTION_CAP,
  MAX_TRAVERSAL_DEPTH,
  PAYLOAD_SOFT_CAP,
  PRIMARY_ACTION_CAP,
  TABLE_COLUMN_CAP,
  TABLE_ROW_CAP,
  buildCard,
  buildSubmitAction,
  utf8ByteLength,
} from "./constants";
import type {
  AdaptiveCardResult,
  TeamsActionSet,
  TeamsAdaptiveCard,
  TeamsCardElement,
  TeamsColumn,
  TeamsContainer,
  TeamsContainerStyle,
  TeamsConversionWarning,
  TeamsFact,
  TeamsInputChoice,
  TeamsTable,
  TeamsTableColumnDefinition,
  TeamsTableRow,
  TeamsTextBlock,
  TeamsTextSize,
  ToAdaptiveCardOptions,
} from "./types";

/** Shared mutable conversion state threaded through one top-level conversion. */
export interface ConversionContext {
  readonly warnings: TeamsConversionWarning[];
  usedInputIds: Set<string>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isElement = (node: NormalizedUINode): node is NormalizedUIElement =>
  isRecord(node);

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const SUBTLE_COLORS = new Set([
  "secondary",
  "alpha-70",
  "white",
  "white-70",
  "white-50",
]);
const isSubtleColor = (color: unknown): boolean =>
  typeof color === "string" && SUBTLE_COLORS.has(color);

const BOLDER_WEIGHTS = new Set(["medium", "semibold", "bold"]);
const isBolderWeight = (weight: unknown): boolean =>
  typeof weight === "string" && BOLDER_WEIGHTS.has(weight);

const TEXT_SIZE_MAP: Record<string, TeamsTextSize> = {
  sm: "small",
  lg: "medium",
  xl: "large",
  "2xl": "extraLarge",
  "3xl": "extraLarge",
};

const warn = (
  context: ConversionContext,
  code: TeamsConversionWarning["code"],
  component: string,
  detail: string,
) => {
  context.warnings.push({ code, component, detail });
};

/**
 * The `aui` key is reserved for the submit envelope (see
 * {@link buildSubmitData} and `decodeSubmitData`): Adaptive Cards merge
 * every input's current value into the same submit object keyed by its
 * `id`, so an input id of `aui` would clobber the envelope. Renamed to an
 * unused id derived from `aui_` instead of being emitted as-is.
 */
const RESERVED_INPUT_ID = "aui";

function reservedSafeId(
  id: string,
  component: string,
  context: ConversionContext,
): string {
  const base = id === RESERVED_INPUT_ID ? `${RESERVED_INPUT_ID}_` : id;
  if (id === RESERVED_INPUT_ID) {
    warn(
      context,
      "clamped",
      component,
      `the input id "${RESERVED_INPUT_ID}" collides with the submit envelope's reserved key and was renamed to "${base}".`,
    );
  }
  let candidate = base;
  let n = 2;
  while (context.usedInputIds.has(candidate)) {
    candidate = `${base}_${n}`;
    n += 1;
  }
  if (candidate !== base) {
    warn(
      context,
      "clamped",
      component,
      `the input id "${base}" was already used on this card and was renamed to "${candidate}".`,
    );
  }
  context.usedInputIds.add(candidate);
  return candidate;
}

/**
 * The shared bounded-iteration primitive: slices `value` to `cap` entries
 * without ever reading past that many indices, so a hostile array (sparse or
 * proxied with a fabricated `length`) cannot stall the event loop.
 */
const clampArray = (
  value: unknown,
  cap: number,
): { readonly items: unknown[]; readonly truncated: boolean } => {
  if (!Array.isArray(value)) return { items: [], truncated: false };
  return { items: value.slice(0, cap), truncated: value.length > cap };
};

const normalizedList = (
  node: NormalizedUINode | undefined,
): NormalizedUINode[] => {
  if (node === undefined || node === null) return [];
  if (!Array.isArray(node)) return [node];
  return node.flatMap((child) => normalizedList(child));
};

function textBlock(
  text: string,
  extra?: Partial<Omit<TeamsTextBlock, "type" | "text" | "wrap">>,
): TeamsTextBlock {
  return { type: "TextBlock", text, wrap: true, ...extra };
}

function applyPending(
  element: TeamsCardElement,
  separator: boolean,
  spacing: boolean,
): TeamsCardElement {
  if (!separator && !spacing) return element;
  return {
    ...element,
    ...(separator ? { separator: true as const } : {}),
    ...(spacing ? { spacing: "large" as const } : {}),
  };
}

const toChoice = (option: unknown): TeamsInputChoice | undefined => {
  if (!isRecord(option) || typeof option["value"] !== "string") {
    return undefined;
  }
  return { title: asString(option["label"]), value: option["value"] };
};

const choicesFrom = (
  optionsProp: unknown,
  component: string,
  context: ConversionContext,
): TeamsInputChoice[] => {
  const { items, truncated } = clampArray(optionsProp, CHOICE_OPTION_CAP);
  if (truncated) {
    warn(
      context,
      "clamped",
      component,
      `options were clamped to ${CHOICE_OPTION_CAP} entries.`,
    );
  }
  const choices: TeamsInputChoice[] = [];
  for (const item of items) {
    const choice = toChoice(item);
    if (choice !== undefined) choices.push(choice);
  }
  return choices;
};

function convertFacts(facts: readonly NormalizedUIElement[]): TeamsCardElement {
  const set: TeamsFact[] = facts.map((fact) => ({
    title: asString(fact.props["label"]),
    value: asString(fact.props["value"]),
  }));
  return { type: "FactSet", facts: set };
}

// Action.Submit has no visual style concept, so a Button's `buttonStyle`
// (positive/destructive or otherwise) has nothing to map onto and is dropped.
function convertButtons(
  buttons: readonly NormalizedUIElement[],
  context: ConversionContext,
): TeamsActionSet {
  if (buttons.length > PRIMARY_ACTION_CAP) {
    warn(
      context,
      "clamped",
      "Button",
      `actions beyond ${PRIMARY_ACTION_CAP} were set to secondary mode.`,
    );
  }
  const actions = buttons.map((button, index) =>
    buildSubmitAction(
      asString(button.props["label"]),
      button.action,
      index >= PRIMARY_ACTION_CAP ? "secondary" : undefined,
    ),
  );
  return { type: "ActionSet", actions };
}

function withCompanionSubmit(
  element: NormalizedUIElement,
  input: TeamsCardElement,
  context: ConversionContext,
): TeamsCardElement[] {
  if (element.action === undefined) return [input];
  warn(
    context,
    "fallback",
    element.type,
    "Teams inputs cannot dispatch on change; a companion submit action was appended.",
  );
  return [
    input,
    {
      type: "ActionSet",
      actions: [buildSubmitAction("Submit", element.action)],
    },
  ];
}

function cardFooterActionSet(
  props: Readonly<Record<string, unknown>>,
): TeamsActionSet | undefined {
  const actions = (["confirm", "cancel"] as const)
    .map((key) => props[key])
    .filter(isRecord)
    .map((footer) =>
      buildSubmitAction(asString(footer["label"]), footer["$action"]),
    );
  return actions.length > 0 ? { type: "ActionSet", actions } : undefined;
}

const ALERT_STYLE_MAP: Record<string, TeamsContainerStyle> = {
  info: "accent",
  success: "good",
  warning: "warning",
  danger: "attention",
};

const stringifyCell = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return "";
};

function convertTable(
  props: Readonly<Record<string, unknown>>,
  context: ConversionContext,
): TeamsTable {
  const { items: rawColumns, truncated: columnsTruncated } = clampArray(
    props["columns"],
    TABLE_COLUMN_CAP,
  );
  const { items: rawRows, truncated: rowsTruncated } = clampArray(
    props["rows"],
    TABLE_ROW_CAP,
  );
  if (columnsTruncated) {
    warn(
      context,
      "clamped",
      "Table",
      `columns were clamped to ${TABLE_COLUMN_CAP} entries.`,
    );
  }
  if (rowsTruncated) {
    warn(
      context,
      "clamped",
      "Table",
      `rows were clamped to ${TABLE_ROW_CAP} entries.`,
    );
  }

  const hasColumns = rawColumns.length > 0;
  const columns: TeamsTableColumnDefinition[] = rawColumns.map(() => ({
    width: 1 as const,
  }));
  const headerRow: TeamsTableRow | undefined = hasColumns
    ? {
        type: "TableRow",
        cells: rawColumns.map((column) => ({
          type: "TableCell" as const,
          items: [textBlock(isRecord(column) ? asString(column["label"]) : "")],
        })),
      }
    : undefined;
  const dataRows: TeamsTableRow[] = rawRows.map((row) => ({
    type: "TableRow",
    cells: (Array.isArray(row) ? row.slice(0, TABLE_COLUMN_CAP) : []).map(
      (cell) => ({
        type: "TableCell" as const,
        items: [textBlock(stringifyCell(cell))],
      }),
    ),
  }));

  return {
    type: "Table",
    firstRowAsHeaders: hasColumns,
    columns,
    rows: headerRow !== undefined ? [headerRow, ...dataRows] : dataRows,
  };
}

function convertListViewItem(
  element: NormalizedUIElement,
  context: ConversionContext,
  depth: number,
): TeamsContainer {
  const items = convertSequence(element.children, context, depth + 1);
  const selectAction = isRecord(element.action)
    ? buildSubmitAction("Open", element.action)
    : undefined;
  return {
    type: "Container",
    items,
    ...(selectAction !== undefined ? { selectAction } : {}),
  };
}

export function convertElement(
  element: NormalizedUIElement,
  context: ConversionContext,
  depth: number,
): TeamsCardElement[] {
  const { props } = element;
  switch (element.type) {
    case "Header":
      return [
        textBlock(asString(props["text"]), {
          size: "large",
          weight: "bolder",
          style: "heading",
        }),
      ];
    case "Text": {
      const mappedSize =
        typeof props["size"] === "string"
          ? TEXT_SIZE_MAP[props["size"]]
          : undefined;
      return [
        textBlock(asString(props["value"]), {
          ...(mappedSize !== undefined ? { size: mappedSize } : {}),
          ...(isBolderWeight(props["weight"]) ? { weight: "bolder" } : {}),
          ...(isSubtleColor(props["color"]) ? { isSubtle: true } : {}),
        }),
      ];
    }
    case "Caption":
      return [
        textBlock(asString(props["value"]), { size: "small", isSubtle: true }),
      ];
    case "Badge":
      return [
        textBlock(asString(props["value"]), { size: "small", isSubtle: true }),
      ];
    case "Markdown":
      // Teams renders a strict subset of markdown (no headings, tables, images,
      // preformatted blocks, or blockquotes); unsupported syntax renders literally.
      return [textBlock(asString(props["value"]))];
    case "Fact":
      return [convertFacts([element])];
    case "Image": {
      const size = props["size"];
      let mappedSize: "small" | "medium" | "large" | undefined;
      if (size === "sm") mappedSize = "small";
      else if (size === "md") mappedSize = "medium";
      else if (size === "lg") mappedSize = "large";
      else if (typeof size === "number") {
        warn(context, "dropped", "Image", "A numeric size was dropped.");
      }
      return [
        {
          type: "Image",
          url: asString(props["src"]),
          altText: asString(props["alt"]),
          ...(mappedSize !== undefined ? { size: mappedSize } : {}),
        },
      ];
    }
    case "Divider":
    case "Spacer":
    case "Icon":
      return [];
    case "Button":
      return [convertButtons([element], context)];
    case "Select": {
      const name = asString(props["name"]);
      const placeholder = asString(props["placeholder"]);
      const label = asString(props["label"]);
      const input: TeamsCardElement = {
        type: "Input.ChoiceSet",
        id: reservedSafeId(name || "select", "Select", context),
        style: "compact",
        choices: choicesFrom(props["options"], "Select", context),
        ...(placeholder ? { placeholder } : {}),
        ...(label ? { label } : {}),
      };
      return withCompanionSubmit(element, input, context);
    }
    case "RadioGroup": {
      const name = asString(props["name"]);
      const label = asString(props["label"]);
      const defaultValue = props["defaultValue"];
      const input: TeamsCardElement = {
        type: "Input.ChoiceSet",
        id: reservedSafeId(name || "radiogroup", "RadioGroup", context),
        style: "expanded",
        choices: choicesFrom(props["options"], "RadioGroup", context),
        ...(typeof defaultValue === "string" && defaultValue
          ? { value: defaultValue }
          : {}),
        ...(label ? { label } : {}),
      };
      return withCompanionSubmit(element, input, context);
    }
    case "Checkbox": {
      const name = asString(props["name"]);
      const label = asString(props["label"]);
      const input: TeamsCardElement = {
        type: "Input.Toggle",
        id: reservedSafeId(name || label || "checkbox", "Checkbox", context),
        title: label,
        value: props["defaultChecked"] === true ? "true" : "false",
        valueOn: "true",
        valueOff: "false",
      };
      return withCompanionSubmit(element, input, context);
    }
    case "Input": {
      const name = asString(props["name"]);
      const label = asString(props["label"]);
      const placeholder = asString(props["placeholder"]);
      const input: TeamsCardElement = {
        type: "Input.Text",
        id: reservedSafeId(name || "input", "Input", context),
        ...(label ? { label } : {}),
        ...(placeholder ? { placeholder } : {}),
        ...(props["multiline"] === true ? { isMultiline: true } : {}),
      };
      return withCompanionSubmit(element, input, context);
    }
    case "DatePicker": {
      const name = asString(props["name"]);
      const label = asString(props["label"]);
      const rawValue = props["value"];
      const value =
        typeof rawValue === "string" && DATE_PATTERN.test(rawValue)
          ? rawValue
          : undefined;
      const rawMin = props["min"];
      const min =
        typeof rawMin === "string" && DATE_PATTERN.test(rawMin)
          ? rawMin
          : undefined;
      const rawMax = props["max"];
      const max =
        typeof rawMax === "string" && DATE_PATTERN.test(rawMax)
          ? rawMax
          : undefined;
      const input: TeamsCardElement = {
        type: "Input.Date",
        id: reservedSafeId(name || "datepicker", "DatePicker", context),
        ...(label ? { label } : {}),
        ...(value !== undefined ? { value } : {}),
        ...(min !== undefined ? { min } : {}),
        ...(max !== undefined ? { max } : {}),
      };
      return withCompanionSubmit(element, input, context);
    }
    case "Form":
      return [
        ...convertSequence(element.children, context, depth + 1),
        {
          type: "ActionSet",
          actions: [buildSubmitAction("Submit", element.action)],
        },
      ];
    case "Card": {
      const titleText = asString(props["title"]);
      const items: TeamsCardElement[] = [];
      if (titleText) {
        items.push(
          textBlock(titleText, {
            size: "large",
            weight: "bolder",
            style: "heading",
          }),
        );
      }
      items.push(...convertSequence(element.children, context, depth + 1));
      const container: TeamsContainer = {
        type: "Container",
        style: "default",
        items,
      };
      const actionSet = cardFooterActionSet(props);
      return actionSet !== undefined ? [container, actionSet] : [container];
    }
    case "Col":
    case "Box":
      return [
        {
          type: "Container",
          items: convertSequence(element.children, context, depth + 1),
        },
      ];
    case "Row": {
      const children = normalizedList(element.children);
      if (children.length > 3) {
        warn(context, "clamped", "Row", "Teams recommends at most 3 columns.");
      }
      const columns: TeamsColumn[] = children.map((child) => ({
        type: "Column",
        width: "auto",
        items: convertSequence(child, context, depth + 1),
      }));
      return [{ type: "ColumnSet", columns }];
    }
    case "ListView": {
      const containers: TeamsContainer[] = [];
      for (const child of normalizedList(element.children)) {
        if (!isElement(child)) continue;
        if (child.type === "ListViewItem") {
          containers.push(convertListViewItem(child, context, depth + 1));
        } else {
          convertElement(child, context, depth + 1);
        }
      }
      return containers.map((container, index) =>
        index > 0 ? { ...container, separator: true } : container,
      );
    }
    case "ListViewItem":
      return [convertListViewItem(element, context, depth)];
    case "Table":
      return [convertTable(props, context)];
    case "Alert": {
      const tone = props["tone"];
      const style =
        typeof tone === "string"
          ? (ALERT_STYLE_MAP[tone] ?? "default")
          : "default";
      const titleText = asString(props["title"]);
      const description = asString(props["description"]);
      const items: TeamsCardElement[] = [];
      if (titleText) items.push(textBlock(titleText, { weight: "bolder" }));
      if (description) items.push(textBlock(description));
      return [{ type: "Container", style, items }];
    }
    case "Carousel": {
      warn(
        context,
        "fallback",
        "Carousel",
        "A carousel was rendered as sequential cards because it is not at the root.",
      );
      const cards = normalizedList(element.children).filter(
        (child): child is NormalizedUIElement =>
          isElement(child) && child.type === "Card",
      );
      return cards.flatMap((card) => convertElement(card, context, depth + 1));
    }
    case "Chart":
      warn(
        context,
        "dropped",
        "Chart",
        "Chart was replaced by a Teams omission note.",
      );
      return [
        textBlock("Chart omitted on Teams.", { isSubtle: true, size: "small" }),
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
}

/**
 * Walks a normalized sequence into card body elements. Nested arrays are
 * flattened into one flat sibling sequence first (via {@link normalizedList}),
 * so a `Divider`/`Fact`/`Button` run merges correctly even when the model
 * wrapped some of its siblings in their own array. Consecutive `Fact`
 * siblings merge into one FactSet and consecutive `Button` siblings merge
 * into one ActionSet; a `Divider`/`Spacer` emits nothing itself but sets
 * `separator`/`spacing` on the next emitted sibling (a trailing or orphan
 * one is dropped silently, since there is no sibling left to carry it).
 * `depth` advances by exactly one per element-nesting level: this call does
 * not itself add a level, since flattening a sibling array or converting a
 * sibling element is not a descent; only a container's own recursive
 * `convertSequence(children, depth + 1)` call is.
 */
export function convertSequence(
  node: NormalizedUINode | undefined,
  context: ConversionContext,
  depth: number,
): TeamsCardElement[] {
  if (node === undefined || node === null || depth > MAX_TRAVERSAL_DEPTH) {
    return [];
  }
  const nodes = normalizedList(node);
  const items: TeamsCardElement[] = [];
  let pendingSeparator = false;
  let pendingSpacing = false;

  const emit = (converted: TeamsCardElement[]) => {
    const [first, ...rest] = converted;
    if (first === undefined) return;
    items.push(applyPending(first, pendingSeparator, pendingSpacing), ...rest);
    pendingSeparator = false;
    pendingSpacing = false;
  };

  for (let index = 0; index < nodes.length;) {
    const current = nodes[index];
    if (current === undefined || current === null) {
      index += 1;
      continue;
    }
    if (isElement(current) && current.type === "Divider") {
      pendingSeparator = true;
      index += 1;
      continue;
    }
    if (isElement(current) && current.type === "Spacer") {
      pendingSpacing = true;
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
      emit([convertFacts(facts)]);
      continue;
    }
    if (isElement(current) && current.type === "Button") {
      const buttons: NormalizedUIElement[] = [];
      while (index < nodes.length) {
        const candidate = nodes[index];
        if (
          !candidate ||
          !isElement(candidate) ||
          candidate.type !== "Button"
        ) {
          break;
        }
        buttons.push(candidate);
        index += 1;
      }
      emit([convertButtons(buttons, context)]);
      continue;
    }
    if (typeof current === "string" || typeof current === "number") {
      emit([textBlock(String(current))]);
    } else {
      emit(convertElement(current as NormalizedUIElement, context, depth));
    }
    index += 1;
  }
  return items;
}

/** Builds a full card (schema envelope plus body) from an already-normalized root, checking the soft payload budget. */
export function convertRootToCard(
  root: NormalizedUINode | readonly NormalizedUINode[],
  context: ConversionContext,
): TeamsAdaptiveCard {
  context.usedInputIds = new Set();
  const body = convertSequence(root, context, 0);
  const card = buildCard(body);
  const size = utf8ByteLength(JSON.stringify(card));
  if (size > PAYLOAD_SOFT_CAP) {
    warn(
      context,
      "clamped",
      "Root",
      `the card is ${size} bytes, exceeding Teams' 100 KB bot message limit.`,
    );
  }
  return card;
}

/**
 * Converts a generative-ui tree into a Microsoft Teams Adaptive Card and
 * non-fatal downgrade warnings. Sizes, weights, and colors map to Adaptive
 * Card's semantic enums rather than raw values. An Input/Select/RadioGroup/
 * Checkbox/DatePicker whose id would be the reserved {@link RESERVED_INPUT_ID}
 * is renamed with a warning (see `decodeSubmitData`). Never throws: an
 * unknown `$type` is skipped with a "dropped" warning, and a malformed input
 * resolves to an empty card plus a "dropped" warning instead of throwing.
 */
export function toAdaptiveCard(
  node: unknown,
  _options?: ToAdaptiveCardOptions,
): AdaptiveCardResult {
  const context: ConversionContext = { warnings: [], usedInputIds: new Set() };
  try {
    const bounded = boundSpec(node, () =>
      warn(
        context,
        "clamped",
        "Root",
        `children were clamped to ${CHILDREN_CAP} entries.`,
      ),
    );
    const { root } = normalizeSpec(bounded as never);
    return {
      card: convertRootToCard(root, context),
      warnings: context.warnings,
    };
  } catch {
    return {
      card: buildCard([]),
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
