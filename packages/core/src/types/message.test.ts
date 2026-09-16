import { expectTypeOf, it } from "vitest";
import type { ThreadMessageLike } from "../runtime/utils/thread-message-like";
import type {
  AppendMessage,
  ThreadAssistantMessage,
  ThreadMessage,
  ThreadSystemMessage,
  ThreadUserMessage,
} from "./message";

it("keeps every role variant assignable to ThreadMessage", () => {
  expectTypeOf<ThreadUserMessage>().toExtend<ThreadMessage>();
  expectTypeOf<ThreadSystemMessage>().toExtend<ThreadMessage>();
  expectTypeOf<ThreadAssistantMessage>().toExtend<ThreadMessage>();
});

it("keeps AppendMessage assignable to ThreadMessageLike", () => {
  expectTypeOf<AppendMessage>().toExtend<ThreadMessageLike>();
});
