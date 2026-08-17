import { describe, expectTypeOf, it } from "vitest";
import type {
  AssistantTransportCommand,
  useAssistantTransportSendCommand,
  useAssistantTransportState,
} from "../assistant-transport";
import type { UserCommands, UserExternalState } from "../augmentations";

declare module "../augmentations" {
  namespace Assistant {
    interface Commands {
      reactCommand: { type: "react-command"; data: number };
    }
    interface ExternalState {
      reactState: { fromReact: boolean };
    }
  }
}

declare module "@assistant-ui/core" {
  namespace Assistant {
    interface Commands {
      coreCommand: { type: "core-command" };
    }
    interface ExternalState {
      coreState: { fromCore: boolean };
    }
  }
}

describe("Assistant augmentations", () => {
  it("react-side contributions reach UserCommands and UserExternalState", () => {
    expectTypeOf<{
      type: "react-command";
      data: number;
    }>().toExtend<UserCommands>();
    expectTypeOf<{ fromReact: boolean }>().toExtend<UserExternalState>();
  });

  it("core-side contributions flow into the react-side unions", () => {
    expectTypeOf<{ type: "core-command" }>().toExtend<UserCommands>();
    expectTypeOf<{ fromCore: boolean }>().toExtend<UserExternalState>();
  });

  it("react-side contributions reach the public transport types", () => {
    expectTypeOf<{
      type: "react-command";
      data: number;
    }>().toExtend<AssistantTransportCommand>();
    expectTypeOf<{ fromReact: boolean }>().toExtend<
      ReturnType<typeof useAssistantTransportState>
    >();
    expectTypeOf<{
      type: "react-command";
      data: number;
    }>().toExtend<
      Parameters<ReturnType<typeof useAssistantTransportSendCommand>>[0]
    >();
  });
});
