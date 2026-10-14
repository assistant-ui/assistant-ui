import {
  hasLaterToolCallInMessage,
  toolCalls,
  type MessageLike,
} from "../../assistant-ui/tool-calls";
import type { ActionHandler } from "../actions";
import type { Catalog } from "../catalog";
import { formulaReads } from "../calc";
import { templateStatePaths } from "../expressions";
import { escapePointerToken, getAtPointer } from "../pointer";
import type { SpecPromptOptions } from "../prompt";
import {
  createSpecTools,
  SPEC_TOOL_RESULTS_RULE,
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

/** The state paths a value reads, split into those it shows and those it tests: inside a `$cond` test, or as a `$calc` condition. */
function stateReads(root: unknown): { shown: string[]; tested: string[] } {
  const shown: string[] = [];
  const tested: string[] = [];
  const pending: { value: unknown; testing: boolean }[] = [
    { value: root, testing: false },
  ];
  for (let index = 0; index < pending.length; index++) {
    const { value, testing } = pending[index]!;
    if (typeof value !== "object" || value === null) continue;
    const into = testing ? tested : shown;
    for (const [key, child] of Object.entries(value)) {
      if (typeof child !== "string") {
        pending.push({ value: child, testing: testing || key === "$cond" });
      } else if (key === "$state" || key === "$bindState") into.push(child);
      else if (key === "$template") into.push(...templateStatePaths(child));
      else if (key === "$calc") {
        const reads = formulaReads(child);
        into.push(...reads.values);
        tested.push(...reads.tested);
      }
    }
  }
  return { shown, tested };
}

/** Each place a spec shows state under `/tools` that the mounted results do not have, as a warning, since the model may have read the value from output the thread does not store or may mean a field that is absent. A path the element tests anywhere, in `visible`, a `$cond` test, or a `$calc` condition, is left out, since an absent value takes the other branch there. */
function missingToolResults(
  spec: Spec,
  toolResults: Record<string, unknown[]>,
): SpecIssue[] {
  const issues: SpecIssue[] = [];
  const state = { tools: toolResults };
  for (const [id, element] of Object.entries(spec.elements ?? {})) {
    const visible = stateReads(element?.visible);
    const reads = stateReads([element?.props, element?.on, element?.watch]);
    const tested = new Set(
      [...visible.shown, ...visible.tested, ...reads.tested].map(safePointer),
    );
    const shown = [
      ...reads.shown,
      ...(typeof element?.repeat?.path === "string"
        ? [element.repeat.path]
        : []),
    ].map(safePointer);
    for (const pointer of new Set(shown)) {
      if (!readsTools(pointer) || tested.has(pointer)) continue;
      if (getAtPointer(state, pointer) !== undefined) continue;
      issues.push({
        code: "missing-tool-result",
        severity: "warning",
        elementId: id,
        path: `/elements/${escapePointerToken(id)}`,
        message: `"${id}" shows \`${pointer}\`, which the earlier tool results do not have, so it shows nothing there. If you read that value from the tool's output, write it into the spec instead.`,
      });
    }
  }
  return issues;
}

/** The app's rules and where earlier tool results are, which `render_spec`'s description and the `spec` module both carry. */
const toolkitRules = (
  specPrompt: Omit<SpecPromptOptions, "mode"> | undefined,
) => [...(specPrompt?.customRules ?? []), SPEC_TOOL_RESULTS_RULE];

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
    const running = tools.render_spec.execute(input);
    // `execute` stores this call's spec before it returns, so the spec is read before an overlapping call with the same title stores its own.
    const spec = specs.get(input.title)?.spec;
    const result = await running;
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
