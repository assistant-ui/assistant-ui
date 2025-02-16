// span = assistant-stream
// you can nest assistant-streams (inside spans that accept nesting)
// 1 content part = 1 assistant-stream / span

// root container span
// spans have controllers to emit events
// assistant-stream === span  (span: start, events, finish, errors?)

import { createAssistantStreamResponse } from "./modules/runs";
import { AssistantStream } from "./AssistantStream";
import { DataStreamDecoder } from "./serialization/DataStream";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const POST = () => {
  return createAssistantStreamResponse(async (controller) => {
    controller.appendText("hello ");
    await sleep(1000);
    controller.appendText("world!");
  });
};

const stream = AssistantStream.fromResponse(POST(), new DataStreamDecoder());
const reader = stream.getReader();
console.log(await reader.read());
console.log(await reader.read());
console.log(await reader.read());
