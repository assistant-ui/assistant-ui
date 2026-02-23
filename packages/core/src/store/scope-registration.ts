import type { ThreadsClientSchema } from "./scopes/threads";
import type { ThreadListItemClientSchema } from "./scopes/thread-list-item";
import type { ThreadClientSchema } from "./scopes/thread";
import type { MessageClientSchema } from "./scopes/message";
import type { PartClientSchema } from "./scopes/part";
import type { ComposerClientSchema } from "./scopes/composer";
import type { AttachmentClientSchema } from "./scopes/attachment";
import type { ModelContextClientSchema } from "./scopes/model-context";
import type { SuggestionsClientSchema } from "./scopes/suggestions";
import type { SuggestionClientSchema } from "./scopes/suggestion";
import type { ChainOfThoughtClientSchema } from "./scopes/chain-of-thought";

declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    threads: ThreadsClientSchema;
    threadListItem: ThreadListItemClientSchema;
    thread: ThreadClientSchema;
    message: MessageClientSchema;
    part: PartClientSchema;
    composer: ComposerClientSchema;
    attachment: AttachmentClientSchema;
    modelContext: ModelContextClientSchema;
    suggestions: SuggestionsClientSchema;
    suggestion: SuggestionClientSchema;
    chainOfThought: ChainOfThoughtClientSchema;
  }
}
