import { resource, tapMemo, tapState } from "@assistant-ui/tap";
import type { ClientOutput } from "../types/client";
import type {
  ChainOfThoughtState,
  ChainOfThoughtPart,
} from "../scopes/chain-of-thought";
import type { MessagePartStatus } from "../../types";
import type { PartMethods } from "../scopes/part";

const COMPLETE_STATUS: MessagePartStatus = Object.freeze({
  type: "complete",
});

export const ChainOfThoughtClient = resource(
  ({
    parts,
    getMessagePart,
  }: {
    parts: readonly ChainOfThoughtPart[];
    getMessagePart: (selector: { index: number }) => PartMethods;
  }): ClientOutput<"chainOfThought"> => {
    const [collapsed, setCollapsed] = tapState(true);

    const status = tapMemo(() => {
      const lastPart = parts[parts.length - 1];
      return lastPart?.status ?? COMPLETE_STATUS;
    }, [parts]);

    const state = tapMemo<ChainOfThoughtState>(
      () => ({ parts, collapsed, status }),
      [parts, collapsed, status],
    );

    return {
      getState: () => state,
      setCollapsed,
      part: getMessagePart,
    };
  },
);
