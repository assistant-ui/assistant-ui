import {
  hasLaterToolCallInMessage,
  toolCalls,
  type MessageLike,
} from "../../assistant-ui/tool-calls";
import type { ActionHandler } from "../actions";
import type { Catalog } from "../catalog";
import { formulaValueReads } from "../calc";
import { templateStatePaths } from "../expressions";
import { escapePointerToken, getAtPointer } from "../pointer";
import type { SpecPromptOptions } from "../prompt";
import {
  createSpecTools,
  specGuidanceModule,
  type RenderSpecInput,
} from "../render-spec";
import type { SpecStateWrite } from "../state";
import { parseSpecStream } from "../stream";
import { safePointer } from "../tree";
import type { Spec } from "../types";
import { formatSpecIssues, type SpecIssue } from "../validate";

/** The arguments of a `render_spec` call, which stream in. */
export type SpecArgs = Partial<RenderSpecInput>;

/** The interactions a host records on a tool call, as its `unstable_interactions` prop holds them. */
export type InteractionLog = {
  readonly entries: readonly (
    | {
        readonly type: "action";
        readonly payload: Readonly<Record<string, unknown>>;
      }
    | { readonly type: "human-response"; readonly payload: unknown }
  )[];
};

/**
 * The state writes saved on a `render_spec` call: the newest `setState` interaction recorded for that call. An entry whose `writes` is not a list marks a save that failed, so the call starts from the model's state rather than from an older snapshot.
 */
export function savedWrites(
  log: InteractionLog | undefined,
  toolCallId: string,
): SpecStateWrite[] {
  const entries = log?.entries ?? [];
  for (let index = entries.length - 1; index >= 0; index--) {
    const entry = entries[index]!;
    if (
      entry.type !== "action" ||
      entry.payload["type"] !== "setState" ||
      entry.payload["toolCallId"] !== toolCallId
    )
      continue;
    const writes = entry.payload["writes"];
    if (!Array.isArray(writes)) return [];
    return writes.filter(
      (write): write is SpecStateWrite =>
        Array.isArray(write) &&
        typeof write[0] === "string" &&
        (write.length === 2 ||
          (write.length === 3 && write[2] === "replace") ||
          (write.length === 4 &&
            (write[2] === "add" || write[2] === "replace") &&
            Array.isArray(write[3]) &&
            write[3].every((path: unknown) => typeof path === "string"))),
    );
  }
  return [];
}

const WIDGET_TOOLS = new Set([
  "read_me",
  "show_widget",
  "edit_widget",
  "preview_widget",
  "render_spec",
]);

/** Results of the tool calls before this one, by tool name and newest first, leaving out the widget toolkit's own tools. Tool names are keys every model can see, unlike call ids, which some formats never show, and counting back from this call keeps an index stable when a host prunes older history. */
export function resolveToolResults(
  messages: readonly MessageLike[],
  toolCallId: string,
): Record<string, unknown[]> {
  const results: Record<string, unknown[]> = Object.create(null);
  for (const call of toolCalls(messages)) {
    if (call.id === toolCallId) break;
    if (WIDGET_TOOLS.has(call.name)) continue;
    (results[call.name] ??= []).unshift(decodeResult(call.result));
  }
  return results;
}

/** A string result that holds a JSON object or array is decoded, since the model read that string as the structure. */
function decodeResult(result: unknown): unknown {
  if (typeof result !== "string") return result;
  try {
    const value: unknown = JSON.parse(result);
    return typeof value === "object" && value !== null ? value : result;
  } catch {
    return result;
  }
}

/** A `spec` argument as the renderers read it, with `elements` an object even while the argument is still streaming in. */
export const specFromArgs = (spec: object): Spec => {
  const value = { state: {}, ...spec } as Spec;
  return typeof value.elements === "object" && value.elements !== null
    ? value
    : { ...value, elements: {} };
};

/**
 * The spec a `render_spec` call's patches apply onto: the result of the
 * earlier `render_spec` calls with the same title in the thread.
 */
export function resolveSpecBase(
  messages: readonly MessageLike[],
  toolCallId: string,
  title: string,
): Spec | undefined {
  let spec: Spec | undefined;
  for (const call of toolCalls(messages)) {
    if (call.id === toolCallId) return spec;
    if (call.name !== "render_spec" || call.args["title"] !== title) continue;
    if (call.args["spec"] && typeof call.args["spec"] === "object") {
      spec = specFromArgs(call.args["spec"]);
    } else if (typeof call.args["patches"] === "string") {
      spec = parseSpecStream(
        call.args["patches"],
        spec ? { initial: spec } : {},
      ).spec;
    }
  }
  return spec;
}

/** Whether a later `render_spec` call in the same message has this call's title. That call shows the spec this one's patches lead to, so this one shows nothing rather than a second copy. */
export function supersededInMessage(
  messages: readonly MessageLike[],
  toolCallId: string,
  title: string,
): boolean {
  return hasLaterToolCallInMessage(
    messages,
    toolCallId,
    title,
    (call) => call.name === "render_spec",
  );
}

function priorSpecCalls(
  messages: readonly MessageLike[],
  toolCallId: string,
  title: string,
): number {
  let count = 0;
  for (const call of toolCalls(messages)) {
    if (call.id === toolCallId) break;
    if (call.name === "render_spec" && call.args["title"] === title) count++;
  }
  return count;
}

type SpecHistory = {
  base(title: string): { spec: Spec | undefined; version: number };
  toolResults: Record<string, unknown[]> | undefined;
};

/** What a mounted call registers for `execute`: the spec each title held before it in its own thread, how many calls built it, and the earlier results it mounts under `/tools`. */
export const callHistory = (
  messages: readonly MessageLike[],
  toolCallId: string,
  toolResults: Record<string, unknown[]> | undefined,
): SpecHistory => ({
  base: (title) => ({
    spec: resolveSpecBase(messages, toolCallId, title),
    version: priorSpecCalls(messages, toolCallId, title),
  }),
  toolResults,
});

const readsTools = (pointer: string) =>
  pointer === "/tools" || pointer.startsWith("/tools/");

/** Each place a spec shows state under `/tools` that the mounted results do not have, as a warning, since the model may have read the value from output the thread does not store or may mean a field that is absent. A read only tested as a condition is left out, since there an absent value takes the other branch. */
function missingToolResults(
  spec: Spec,
  toolResults: Record<string, unknown[]>,
): SpecIssue[] {
  const issues: SpecIssue[] = [];
  const state = { tools: toolResults };
  for (const [id, element] of Object.entries(spec.elements ?? {})) {
    const reported = new Set<string>();
    const check = (path: string) => {
      const pointer = safePointer(path);
      if (!readsTools(pointer) || reported.has(pointer)) return;
      if (getAtPointer(state, pointer) !== undefined) return;
      reported.add(pointer);
      issues.push({
        code: "missing-tool-result",
        severity: "warning",
        elementId: id,
        path: `/elements/${escapePointerToken(id)}`,
        message: `"${id}" shows \`${pointer}\`, which the earlier tool results do not have, so it shows nothing there. If you read that value from the tool's output, write it into the spec instead.`,
      });
    };
    const pending: unknown[] = [element?.props, element?.on, element?.watch];
    while (pending.length > 0) {
      const value = pending.pop();
      if (typeof value !== "object" || value === null) continue;
      for (const [key, child] of Object.entries(value)) {
        if (key === "$cond") continue;
        if (typeof child === "string") {
          if (key === "$state" || key === "$bindState") check(child);
          else if (key === "$template")
            templateStatePaths(child).forEach(check);
          else if (key === "$calc") formulaValueReads(child).forEach(check);
          continue;
        }
        pending.push(child);
      }
    }
    if (typeof element?.repeat?.path === "string") check(element.repeat.path);
  }
  return issues;
}

/** The app's rules and where earlier tool results are, which `render_spec`'s description and the `spec` module both carry. */
const toolkitRules = (
  specPrompt: Omit<SpecPromptOptions, "mode"> | undefined,
) => [
  ...(specPrompt?.customRules ?? []),
  'Results of earlier tool calls are in state under `/tools/<toolName>/<n>`, newest first: `0` is the latest call to that tool before this `render_spec` call, `1` the one before it, and so on. Show their values with `{ "$state": "/tools/<toolName>/<n>/..." }` rather than copying them, and never write `tools` in `state`. Indexes count back from each `render_spec` call, so when a patch follows another call to the same tool, update any binding that should keep showing the older result.',
];

/**
 * The `render_spec` tool a toolkit shares across its calls. Each mounted call
 * registers its {@link callHistory} in `histories` under its tool call id, so
 * `execute` patches the base that call's own thread held, even after a reload
 * or in another thread.
 */
export function createSpecCalls(
  catalog: Catalog,
  specPrompt: Omit<SpecPromptOptions, "mode"> | undefined,
) {
  const specs = new Map<string, { spec: Spec; version: number }>();
  const tools = createSpecTools(catalog, {
    specs,
    customRules: toolkitRules(specPrompt),
  });
  const histories = new Map<string, SpecHistory>();
  const execute = async (
    input: RenderSpecInput,
    call: { toolCallId: string },
  ) => {
    const history = histories.get(call.toolCallId);
    if (history) {
      const { spec, version } = history.base(input.title);
      if (spec) specs.set(input.title, { spec, version });
      else specs.delete(input.title);
    }
    const result = await tools.render_spec.execute(input);
    const spec = specs.get(input.title)?.spec;
    // The results are mounted only while the spec writes no `tools` of its own.
    if (!history?.toolResults || !spec || spec.state?.["tools"] !== undefined)
      return result;
    const missing = missingToolResults(spec, history.toolResults);
    if (missing.length === 0) return result;
    const issues = [...result.issues, ...missing];
    return { ...result, issues, feedback: formatSpecIssues(issues) };
  };
  return { tools, histories, execute };
}

/** The `spec` module of `read_me`: the catalog guidance with the built-in actions every assistant-ui toolkit handles, the app's rules, and where earlier tool results are. */
export const specModules = (
  catalog: Catalog,
  specPrompt: Omit<SpecPromptOptions, "mode"> | undefined,
  host: { clipboard: boolean },
) => [
  specGuidanceModule(catalog, {
    ...specPrompt,
    hostApi: {
      prompt: true,
      modelContext: true,
      clipboard: host.clipboard,
      ...specPrompt?.hostApi,
    },
    customRules: toolkitRules(specPrompt),
  }),
];

/** Writes to the browser's clipboard, rejecting where the Clipboard API is missing. */
export const writeClipboard = (text: string): Promise<void> =>
  typeof navigator !== "undefined" && navigator.clipboard
    ? navigator.clipboard.writeText(text)
    : Promise.reject(new Error("Clipboard API is unavailable"));

/** The built-in `copyText` handler. A copy that does not happen fails, so the rest of the list, such as a confirmation, does not run. */
export const copyTextHandler =
  (write: (text: string) => Promise<void>): ActionHandler =>
  (params, source) => {
    if (source.kind === "watch") {
      throw new Error(
        "copyText runs only from an event a component emits, never from `watch`",
      );
    }
    const text = params["text"];
    if (typeof text !== "string") {
      throw new Error("copyText needs a string `text`");
    }
    return write(text);
  };
