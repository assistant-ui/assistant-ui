import type { AppendMessage } from "@assistant-ui/core";
import type { LangChainBaseMessage } from "./types";
import { getMessageType } from "./convertMessages";

export type StagedMessage = LangChainBaseMessage & { id: string };

export type StagedEntry = {
  message: StagedMessage;
  runConfig: AppendMessage["runConfig"];
  reconcileOnEcho: boolean;
  baseMessageCount: number;
  transcriptStatus?: "unsent" | "sent";
};

export type LangChainThreadState = {
  forkGeneration: number;
  forkPending: boolean;
  stagedEntries: ReadonlyMap<string, StagedEntry>;
  stagedBaseMessages: LangChainBaseMessage[] | null;
  visibleStagedMessages: LangChainBaseMessage[] | null;
};

export type LangChainThreadAction =
  | { type: "supersedeFork" }
  | { type: "finishFork"; generation: number }
  | { type: "cancelFork" }
  | {
      type: "stage";
      entry: StagedEntry;
      visibleMessages: readonly LangChainBaseMessage[];
    }
  | {
      type: "stageEdit";
      entry: StagedEntry;
      baseMessages: LangChainBaseMessage[];
    }
  | {
      type: "reconcile";
      messages: LangChainBaseMessage[];
      visibleMessages: readonly LangChainBaseMessage[];
    }
  | {
      type: "markTranscript";
      messages: readonly LangChainBaseMessage[];
      status: "unsent" | "sent";
    }
  | {
      type: "remove";
      id: string;
      visibleMessages: readonly LangChainBaseMessage[];
    }
  | {
      type: "promote";
      messages: readonly LangChainBaseMessage[];
      visibleMessages: readonly LangChainBaseMessage[];
    };

export const createLangChainThreadState = (): LangChainThreadState => ({
  forkGeneration: 0,
  forkPending: false,
  stagedEntries: new Map(),
  stagedBaseMessages: null,
  visibleStagedMessages: null,
});

const humanContentText = (content: LangChainBaseMessage["content"]) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (part): part is { type: "text"; text: string } =>
        typeof part === "object" &&
        part !== null &&
        part.type === "text" &&
        typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("");
};

const hasSameMessageContent = (
  a: LangChainBaseMessage,
  b: LangChainBaseMessage,
) => humanContentText(a.content) === humanContentText(b.content);

export const reduceLangChainThreadState = (
  state: LangChainThreadState,
  action: LangChainThreadAction,
): LangChainThreadState => {
  switch (action.type) {
    case "supersedeFork":
      return {
        ...state,
        forkGeneration: state.forkGeneration + 1,
        forkPending: true,
      };
    case "finishFork":
      return state.forkGeneration === action.generation
        ? { ...state, forkPending: false }
        : state;
    case "cancelFork":
      return {
        ...state,
        forkGeneration: state.forkGeneration + 1,
        forkPending: false,
      };
    case "stage": {
      const stagedEntries = new Map(state.stagedEntries);
      stagedEntries.set(action.entry.message.id, action.entry);
      return {
        ...state,
        stagedEntries,
        visibleStagedMessages: [
          ...action.visibleMessages,
          action.entry.message,
        ],
      };
    }
    case "stageEdit": {
      const stagedEntries = new Map(state.stagedEntries);
      stagedEntries.set(action.entry.message.id, action.entry);
      return {
        ...state,
        stagedEntries,
        stagedBaseMessages: action.baseMessages,
        visibleStagedMessages: [...action.baseMessages, action.entry.message],
      };
    }
    case "reconcile": {
      if (state.stagedEntries.size === 0) return state;
      // Staged edits must keep their truncated base while stream updates arrive before promotion.
      const baseMessages = state.stagedBaseMessages ?? action.messages;
      const stagedEntries = new Map(state.stagedEntries);
      const remainingStagedMessages: LangChainBaseMessage[] = [];
      const matchedBaseMessageIndexes = new Set<number>();
      const visibleStagedIds = new Set(
        action.visibleMessages.flatMap((message) =>
          message.id ? [message.id] : [],
        ),
      );
      for (const [id, staged] of state.stagedEntries) {
        if (!visibleStagedIds.has(id)) continue;
        const echoed = baseMessages.some((message, index) => {
          if (matchedBaseMessageIndexes.has(index)) return false;
          if (message.id === id) {
            matchedBaseMessageIndexes.add(index);
            return true;
          }
          if (
            !staged.reconcileOnEcho ||
            index < staged.baseMessageCount ||
            getMessageType(message) !== "human" ||
            !hasSameMessageContent(message, staged.message)
          ) {
            return false;
          }
          matchedBaseMessageIndexes.add(index);
          return true;
        });
        if (echoed) stagedEntries.delete(id);
        else remainingStagedMessages.push(staged.message);
      }
      if (remainingStagedMessages.length === 0) {
        if (
          stagedEntries.size === state.stagedEntries.size &&
          state.stagedBaseMessages === null &&
          state.visibleStagedMessages === null
        ) {
          return state;
        }
        return {
          ...state,
          stagedEntries,
          stagedBaseMessages: null,
          visibleStagedMessages: null,
        };
      }
      return {
        ...state,
        stagedEntries,
        visibleStagedMessages: [...baseMessages, ...remainingStagedMessages],
      };
    }
    case "markTranscript": {
      let stagedEntries: Map<string, StagedEntry> | null = null;
      for (const message of action.messages) {
        const entry = message.id
          ? (stagedEntries ?? state.stagedEntries).get(message.id)
          : undefined;
        if (entry?.transcriptStatus) {
          stagedEntries ??= new Map(state.stagedEntries);
          stagedEntries.set(message.id!, {
            ...entry,
            transcriptStatus: action.status,
          });
        }
      }
      return stagedEntries ? { ...state, stagedEntries } : state;
    }
    case "remove": {
      if (!state.stagedEntries.has(action.id)) return state;
      const stagedEntries = new Map(state.stagedEntries);
      stagedEntries.delete(action.id);
      return {
        ...state,
        stagedEntries,
        stagedBaseMessages:
          stagedEntries.size === 0 ? null : state.stagedBaseMessages,
        visibleStagedMessages:
          stagedEntries.size === 0
            ? null
            : action.visibleMessages.filter(
                (message) => message.id !== action.id,
              ),
      };
    }
    case "promote": {
      const stagedEntries = new Map(state.stagedEntries);
      const promotedIds = new Set<string>();
      for (const message of action.messages) {
        if (!message.id || stagedEntries.get(message.id)?.transcriptStatus)
          continue;
        promotedIds.add(message.id);
        stagedEntries.delete(message.id);
      }
      return {
        ...state,
        stagedEntries,
        stagedBaseMessages: null,
        visibleStagedMessages:
          stagedEntries.size > 0
            ? action.visibleMessages.filter(
                (message) => !message.id || !promotedIds.has(message.id),
              )
            : null,
      };
    }
  }
};
