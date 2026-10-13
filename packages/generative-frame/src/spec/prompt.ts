import type { SpecStreamMode } from "./stream";
import { describeSchema } from "../json-schema";
import type { Catalog } from "./catalog";

export type SpecPromptOptions = {
  /**
   * `jsonl`: the output is only JSONL patches, e.g. the `patches`
   * argument of `render_spec`. `inline`: patches go in a ```spec fence inside
   * a normal reply. Defaults to `jsonl`.
   */
  mode?: SpecStreamMode;
  /** Extra rules appended to the built-in ones. */
  customRules?: readonly string[];
  /** Leave out the worked example. */
  omitExample?: boolean;
  /** Built-in actions the host handles, which the guidance then describes: `prompt` for `sendMessage`, `modelContext` for `updateModelContext`, `clipboard` for `copyText`. All default to false. */
  hostApi?: { prompt?: boolean; modelContext?: boolean; clipboard?: boolean };
};

const list = (items: readonly string[]) =>
  items.map((item) => `- ${item}`).join("\n");

const joinClauses = (clauses: readonly string[], conjunction = "and") =>
  clauses.length > 1
    ? `${clauses.slice(0, -1).join(", ")}, ${conjunction} ${clauses.at(-1)}`
    : (clauses[0] ?? "");

/** How to compose an answer from the catalog's components, naming only the ones it has and only uses their slots and events allow. */
const compositionRules = (catalog: Catalog) => {
  const has = (type: string) => catalog.component(type) !== undefined;
  const nests = (type: string) =>
    catalog.component(type)?.slots?.includes("default") ?? false;
  const emits = (type: string) =>
    (catalog.component(type)?.events?.length ?? 0) > 0;
  const nestsAny = Object.keys(catalog.components).some(nests);
  const rules = [
    has("Header") && has("Text")
      ? "Open with a `Header` that names the answer and a `Text` with the one-line takeaway, then give each part of the answer its own section."
      : "Open with a heading that names the answer and its one-line takeaway, then give each part of the answer its own section.",
  ];
  const modules = [
    ...(nests("Card")
      ? [
          "Make each module a `Card`: a summary, a checklist, a form, or one option, with running prose outside cards.",
        ]
      : []),
    ...(nests("Row") && has("Fact")
      ? ["Put the answer's key figures side by side in a `Row` of `Fact`s."]
      : []),
    ...(has("Badge")
      ? ["Show short tags, such as a duration or a price tier, as `Badge`s."]
      : []),
  ];
  if (modules.length) rules.push(modules.join(" "));
  const layouts = [
    ...(has("Map") ? ["put places with coordinates on a `Map`"] : []),
    ...(has("Timeline")
      ? ["lay out a schedule or itinerary as a `Timeline`"]
      : []),
    ...(has("Steps") ? ["write instructions as `Steps`"] : []),
    ...(has("Table")
      ? ["compare options attribute by attribute in a `Table`"]
      : []),
  ];
  if (layouts.length) {
    const sentence = joinClauses(layouts);
    rules.push(`${sentence[0]!.toUpperCase()}${sentence.slice(1)}.`);
  }
  if (has("Image")) {
    const placements = [
      ...(nestsAny
        ? [`lead with two or three photos${nests("Row") ? " in a `Row`" : ""}`]
        : []),
      ...(nests("Card") ? ["open each option's `Card` with its photo"] : []),
      ...(nests("Row") ? ["put a small photo beside each item's text"] : []),
    ];
    rules.push(
      `Show what can be seen with \`Image\`, but only from an image URL a tool returned, never one you write yourself${placements.length ? `: ${joinClauses(placements, "or")}` : ""}.`,
    );
  }
  if (emits("Button")) {
    rules.push(
      `For a number the user adjusts, such as guests or servings, put it between a \`-\` and a \`+\` \`Button\`${nests("Row") ? " in a `Row`" : ""}, each stepping it with a \`setState\` whose \`$calc\` value stays in a sensible range, and compute every amount that depends on it with \`$calc\`.`,
    );
  }
  if (nestsAny) {
    rules.push(
      "Keep lists in `/state` and render them with `repeat`, except a list a component takes as a prop, such as table rows or chart series, which you bind to that prop.",
    );
  }
  rules.push(
    "Keep the tree shallow and give every element a job: no filler, and no decoration that adds nothing.",
  );
  return rules;
};

/** The rules every spec follows: how to compose an answer, then the app's own. `render_spec` carries them in its description too. */
export const specRules = (
  catalog: Catalog,
  customRules: readonly string[] = [],
) => [...compositionRules(catalog), ...customRules];

const componentSection = (catalog: Catalog) => {
  const entries = Object.entries(catalog.components).map(([name, def]) => {
    const lines = [`### ${name}`, def.description];
    const props = catalog.propsSchema(name);
    lines.push(`props: ${props ? describeSchema(props) : "none"}`);
    const propDocs = Object.entries(props?.properties ?? {})
      .filter(([, schema]) => schema.description)
      .map(([key, schema]) => `  - ${key}: ${schema.description}`);
    if (propDocs.length) lines.push(...propDocs);
    const slots = def.slots ?? [];
    lines.push(
      slots.length === 0
        ? "children: none"
        : `children: ${slots
            .map((slot) =>
              slot === "default" ? "`children`" : `\`slots.${slot}\``,
            )
            .join(", ")}`,
    );
    if (def.events?.length) {
      lines.push(`events: ${def.events.map((e) => `\`${e}\``).join(", ")}`);
    }
    return lines.join("\n");
  });
  return `## Components\n\nUse only these types.\n\n${entries.join("\n\n")}`;
};

const actionSection = (
  catalog: Catalog,
  hostApi: NonNullable<SpecPromptOptions["hostApi"]>,
) => {
  const entries = [
    "- `setState` — params `{ path: string; value?: unknown }`. Writes `value` at the JSON Pointer `path` in state. Built in.",
    ...(hostApi.prompt
      ? [
          "- `sendMessage` — params `{ text: string }`. Sends `text` as the user's next message, as if they typed it. Use it behind a button for a follow-up the user asks for. Built in.",
        ]
      : []),
    ...(hostApi.clipboard
      ? [
          '- `copyText` — params `{ text: string }`. Copies `text` to the user\'s clipboard, such as a shopping list behind a "Copy list" button; follow it with a `setState` that shows a short confirmation. Built in.',
        ]
      : []),
    ...(hostApi.modelContext
      ? [
          "- `updateModelContext` — params `{ text?: string; data?: unknown }`. Tells you what the user chose in this UI, with every later message, replacing what it shared before, and clears it when both are missing; nothing is sent. Use it when a choice should shape your next answer, such as the option the user picked. Built in.",
        ]
      : []),
    ...Object.entries(catalog.actions).map(([name, def]) => {
      const params = catalog.paramsSchema(name);
      const schema = params ? describeSchema(params) : undefined;
      return `- \`${name}\` — ${schema && schema !== "unknown" ? `params \`${schema}\`. ` : ""}${def.description}`;
    }),
  ];
  return `## Actions

Bind actions to a component's events with \`on\`: \`"on": { "press": { "action": "setState", "params": { "path": "/tab", "value": "b" } } }\`. A list runs in order. Params may use expressions, and \`{ "$event": "" }\` reads the payload the event carried.

${entries.join("\n")}`;
};

const protocolSection = (mode: SpecStreamMode) => `## Output protocol

A spec is flat: \`{ "root": id, "elements": { id: element }, "state": { … } }\`. An element is \`{ "type", "props", "children": [ids], "slots"?, "visible"?, "repeat"?, "on"?, "watch"? }\`. Children are ids, never nested elements.

Build it with JSON Patch (RFC 6902) operations, one JSON object per line (JSONL), so the UI renders while you write:

${list([
  'Set the root first: `{"op":"add","path":"/root","value":"main"}`.',
  'Then add each element whole, parents before children, in reading order: `{"op":"add","path":"/elements/main","value":{…}}`. A child id may be listed before its element is added.',
  'Put initial state under `/state` before elements that read it: `{"op":"add","path":"/state/filter","value":"all"}`.',
  "Append to an array with `-`: `/elements/main/children/-`. Escape `/` in a key as `~1` and `~` as `~0`.",
  "To change something, `replace` or `remove` its path; do not repeat unchanged elements.",
  "Ids are short, unique, kebab-case, and describe the element (`revenue-card`).",
])}

${
  mode === "inline"
    ? "Write your reply as usual and put the patch lines in a fenced block that starts with ```spec and ends with ```. Text outside the fence is shown to the user as prose; keep it short and do not repeat what the UI shows."
    : "Output only patch lines: no prose, no code fences, no comments."
}`;

const expressionSection = () => `## Expressions

Any prop or action param may be an expression object instead of a literal:

${list([
  '`{ "$state": "/path" }` reads state.',
  '`{ "$bindState": "/path" }` reads state and lets the component write it back (inputs, toggles, selects).',
  '`{ "$template": "Hello ${/user/name}" }` fills `${…}` placeholders with state values.',
  '`{ "$cond": condition, "$then": a, "$else": b }` picks a value.',
  "`{ \"$calc\": \"round(${/guests} * 0.5, 1) + ' lb'\" }` computes a value with a formula over `${…}` references, numbers, and `'text'`: `+ - * / %`, `== != < <= > >=`, `a ? b : c`, and `&& || !`, which give `true` or `false` (write a default as `${/name} ? ${/name} : 'Guest'`). Functions: `round(x, digits)`, `floor`, `ceil`, `abs`, `clamp(x, low, high)`, `min` and `max` (of numbers, or of a list), `count(list)`, `sum(list)` and `avg(list)` (or of a field, `sum(list, '/price')`), and, formatting in en-US, `number(x, digits)`, `currency(x, 'USD')`, `percent(fraction)`, `time(minutesAfterMidnight)`, and `plural(n, 'item', 'items')`. `+` joins text when either side is text. A formula that cannot compute gives `null`.",
  'Inside `repeat`: `{ "$item": "/field" }`, `{ "$bindItem": "/field" }`, `{ "$index": true }`, and `${$item/field}` in templates.',
])}

## Visibility and repetition

${list([
  '`"visible"` takes a condition: `true`/`false`, `{ "$state": "/open" }` (truthy), a comparison `{ "$state": "/count", "gt": 0 }` with `eq`, `neq`, `gt`, `gte`, `lt`, or `lte`, a formula `{ "$calc": "${/count} > 2" }`, `{ "not": condition }`, `{ "$or": [ … ] }`, `{ "$and": [ … ] }`, or an array (all must hold).',
  '`"repeat": { "path": "/items", "key": "id" }` renders the element\'s children once per item of the state array at `path`.',
  '`"watch": { "/path": action }` runs an action whenever that state value changes.',
])}`;

const EXAMPLE = `## Example

{"op":"add","path":"/root","value":"main"}
{"op":"add","path":"/state","value":{"count":0}}
{"op":"add","path":"/elements/main","value":{"type":"Stack","props":{"gap":"md"},"children":["title","counter","bump"]}}
{"op":"add","path":"/elements/title","value":{"type":"Heading","props":{"text":"Clicks"}}}
{"op":"add","path":"/elements/counter","value":{"type":"Text","props":{"text":{"$template":"Clicked \${/count} times"}}}}
{"op":"add","path":"/elements/bump","value":{"type":"Button","props":{"label":"Click"},"on":{"press":{"action":"setState","params":{"path":"/count","value":{"$calc":"\${/count} + 1"}}}}}}

(The example's types are illustrative; use the components listed above.)`;

/**
 * Model guidance for a catalog: the component and action reference, the
 * JSONL patch protocol, expressions, and rules. Deterministic for a given
 * catalog and options.
 */
export function buildSpecPrompt(
  catalog: Catalog,
  options: SpecPromptOptions = {},
): string {
  const mode = options.mode ?? "jsonl";
  const rules = [
    "Use only the listed component types, props, events, and actions.",
    "Every id in `children` or `slots` must be added as an element; every element except the root must be someone's child.",
    "Give props literal values unless they depend on state; keep data (rows, series) in props or `/state`, not in text.",
    ...specRules(catalog, options.customRules),
  ];
  return [
    "# Declarative UI",
    "You describe UI as a spec of trusted components that the host renders with its own design system. You choose components and data; the host owns styling.",
    protocolSection(mode),
    componentSection(catalog),
    actionSection(catalog, options.hostApi ?? {}),
    expressionSection(),
    `## Rules\n\n${list(rules)}`,
    ...(options.omitExample ? [] : [EXAMPLE]),
  ].join("\n\n");
}
