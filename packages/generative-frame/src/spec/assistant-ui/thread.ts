import { toolCalls, type MessageLike } from "../../assistant-ui/tool-calls";
import type { ActionHandler } from "../actions";
import type { Catalog } from "../catalog";
import type { SpecPromptOptions } from "../prompt";
import {
  createSpecTools,
  specGuidanceModule,
  type RenderSpecInput,
} from "../render-spec";
import type { SpecStateWrite } from "../state";
import { parseSpecStream } from "../stream";
import type { Spec } from "../types";

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
        write.length === 2 &&
        typeof write[0] === "string",
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
      spec = { state: {}, ...(call.args["spec"] as Spec) };
    } else if (typeof call.args["patches"] === "string") {
      spec = parseSpecStream(
        call.args["patches"],
        spec ? { initial: spec } : {},
      ).spec;
    }
  }
  return spec;
}

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whether streamed arguments hold this whole title, not a prefix of a longer one that is still arriving. */
const holdsTitle = (argsText: string | undefined, title: string) =>
  argsText === undefined ||
  new RegExp(
    `"title"\\s*:\\s*${escapeRegExp(JSON.stringify(title))}\\s*[,}]`,
  ).test(argsText);

/** Whether a later `render_spec` call in the same message has this call's title. That call shows the spec this one's patches lead to, so this one shows nothing rather than a second copy. */
export function supersededInMessage(
  messages: readonly MessageLike[],
  toolCallId: string,
  title: string,
): boolean {
  if (!title) return false;
  for (const message of messages) {
    let seen = false;
    for (const call of toolCalls([message])) {
      if (call.id === toolCallId) seen = true;
      else if (
        seen &&
        call.name === "render_spec" &&
        call.args["title"] === title &&
        holdsTitle(call.argsText, title)
      )
        return true;
    }
    if (seen) return false;
  }
  return false;
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

type SpecHistory = (title: string) => {
  spec: Spec | undefined;
  version: number;
};

/** What a mounted call registers for `execute`: the spec each title held before it in its own thread, and how many calls built it. */
export const callHistory =
  (messages: readonly MessageLike[], toolCallId: string): SpecHistory =>
  (title) => ({
    spec: resolveSpecBase(messages, toolCallId, title),
    version: priorSpecCalls(messages, toolCallId, title),
  });

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
  const execute = (input: RenderSpecInput, call: { toolCallId: string }) => {
    const history = histories.get(call.toolCallId);
    if (history) {
      const { spec, version } = history(input.title);
      if (spec) specs.set(input.title, { spec, version });
      else specs.delete(input.title);
    }
    return tools.render_spec.execute(input);
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
