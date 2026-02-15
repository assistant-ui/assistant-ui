import "@assistant-ui/core/store";

import type { ThreadsClientSchema } from "./scopes/threads";
import type { ThreadListItemClientSchema } from "./scopes/threadListItem";
import type { ThreadClientSchema } from "./scopes/thread";
import type { MessageClientSchema } from "./scopes/message";
import type { ComponentClientSchema } from "./scopes/component";
import type { PartClientSchema } from "./scopes/part";
import type { ComposerClientSchema } from "./scopes/composer";
import type { AttachmentClientSchema } from "./scopes/attachment";
import type { ToolsClientSchema } from "./scopes/tools";
import type { DataRenderersClientSchema } from "./scopes/dataRenderers";

declare module "@assistant-ui/core/store" {
  interface ScopeRegistry {
    threads: ThreadsClientSchema;
    threadListItem: ThreadListItemClientSchema;
    thread: ThreadClientSchema;
    message: MessageClientSchema;
    component: ComponentClientSchema;
    part: PartClientSchema;
    composer: ComposerClientSchema;
    attachment: AttachmentClientSchema;
    tools: ToolsClientSchema;
    dataRenderers: DataRenderersClientSchema;
  }
}
