import { expectTypeOf, it } from "vitest";
import type { SendCommandsRequestBody } from "./types";

it("models threadId as an optional remote identifier", () => {
  expectTypeOf<{}>().toExtend<Pick<SendCommandsRequestBody, "threadId">>();
  expectTypeOf<SendCommandsRequestBody["threadId"]>().toEqualTypeOf<
    string | undefined
  >();
});
