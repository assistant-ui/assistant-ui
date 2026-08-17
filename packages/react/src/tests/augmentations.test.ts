import { describe, expectTypeOf, it } from "vitest";
import type { UserCommands, UserExternalState } from "../augmentations";
import type {
  AssistantTransportCommand,
  useAssistantTransportRuntime,
  useAssistantTransportSendCommand,
  useAssistantTransportState,
} from "../index";

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
    type RuntimeOptions = Parameters<typeof useAssistantTransportRuntime>[0];
    expectTypeOf<{
      type: "react-command";
      data: number;
    }>().toExtend<
      Parameters<RuntimeOptions["converter"]>[1]["pendingCommands"][number]
    >();
    expectTypeOf<{
      type: "react-command";
      data: number;
    }>().toExtend<
      Parameters<NonNullable<RuntimeOptions["onError"]>>[1]["commands"][number]
    >();
    expectTypeOf<{
      type: "react-command";
      data: number;
    }>().toExtend<
      Parameters<NonNullable<RuntimeOptions["onCancel"]>>[0]["commands"][number]
    >();
    expectTypeOf<{
      type: "react-command";
      data: number;
    }>().toExtend<
      Parameters<
        NonNullable<RuntimeOptions["prepareSendCommandsRequest"]>
      >[0]["commands"][number]
    >();
  });
});
