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
};

const list = (items: readonly string[]) =>
  items.map((item) => `- ${item}`).join("\n");

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

const actionSection = (catalog: Catalog) => {
  const entries = [
    "- `setState` — params `{ path: string; value?: unknown }`. Writes `value` at the JSON Pointer `path` in state. Built in.",
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
  '`{ "$calc": "min(${/guests} + 1, 20)" }` evaluates a bounded formula and returns a number, boolean, string, or null.',
  '`{ "$cond": condition, "$then": a, "$else": b }` picks a value.',
  'Inside `repeat`: `{ "$item": "/field" }`, `{ "$bindItem": "/field" }`, `{ "$index": true }`, and `${$item/field}` in templates.',
  "Formulas use numbers, quoted strings, `true`, `false`, `null`, and references such as `${/path}`, `${$item/price}`, `${$index}`, and `${$event/value}`.",
  "Operators, from loosest to tightest: `? :`, `||`, `&&`, `== !=`, `< <= > >=`, `+ -`, `* / %`, unary `- !`, and parentheses.",
  "Functions: `round(x, digits?)`, `floor(x)`, `ceil(x)`, `abs(x)`, `min(...numbers)` or `min(list, field?)`, `max(...numbers)` or `max(list, field?)`, `clamp(x, low, high)`, `count(list)`, `sum(list, field?)`, `avg(list, field?)`, `number(x, digits?)`, `currency(x, code)`, `percent(x, digits?)`, `time(minutes)`, and `plural(n, one, other)`. List field pointers look like `'/price'`.",
  "The `+` operator adds numbers and joins text when either side is a string; `null` becomes empty text. Other arithmetic needs numbers. Comparisons use deep equality or compare two numbers or two strings.",
  "`&&`, `||`, and `!` use truthiness and produce booleans. Text functions format with `en-US`; `number` and `percent` digits set the exact fraction digits, and `time` formats minutes after midnight.",
  "Missing references, division by zero, and non-finite results evaluate to `null`. A formula is limited to 500 characters, 32 nested levels, and 10,000 evaluation steps. Invalid formulas are reported by spec validation and evaluate to `null`.",
])}

## Visibility and repetition

${list([
  '`"visible"` takes a condition: `true`/`false`, `{ "$state": "/open" }` or `{ "$calc": "${/count} > 0" }` (truthy), a comparison `{ "$state": "/count", "gt": 0 }` with `eq`, `neq`, `gt`, `gte`, `lt`, or `lte`, `{ "not": condition }`, `{ "$or": [ … ] }`, `{ "$and": [ … ] }`, or an array (all must hold).',
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
    "Keep the tree shallow and the UI focused: one clear purpose, at most about 30 elements.",
    ...(options.customRules ?? []),
  ];
  return [
    "# Declarative UI",
    "You describe UI as a spec of trusted components that the host renders with its own design system. You choose components and data; the host owns styling.",
    protocolSection(mode),
    componentSection(catalog),
    actionSection(catalog),
    expressionSection(),
    `## Rules\n\n${list(rules)}`,
    ...(options.omitExample ? [] : [EXAMPLE]),
  ].join("\n\n");
}
