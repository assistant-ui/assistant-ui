import "@assistant-ui/store";

import type { ThreadsClientSchema } from "./scopes/threads";
import type { ThreadListItemClientSchema } from "./scopes/threadListItem";
import type { ThreadClientSchema } from "./scopes/thread";
import type { MessageClientSchema } from "./scopes/message";
import type { PartClientSchema } from "./scopes/part";
import type { ComposerClientSchema } from "./scopes/composer";
import type { AttachmentClientSchema } from "./scopes/attachment";
import type { ToolsClientSchema } from "./scopes/tools";
import type { ModelContextClientSchema } from "./scopes/modelContext";

declare module "@assistant-ui/store" {
  interface ClientRegistry {
    threads: ThreadsClientSchema;
    threadListItem: ThreadListItemClientSchema;
    thread: ThreadClientSchema;
    message: MessageClientSchema;
    part: PartClientSchema;
    composer: ComposerClientSchema;
    attachment: AttachmentClientSchema;
    tools: ToolsClientSchema;
    modelContext: ModelContextClientSchema;
  }
}
