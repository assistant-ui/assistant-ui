import { useMemo, useState } from "react";
import { resource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import type {
  ChainOfThoughtState,
  ChainOfThoughtPart,
} from "../scopes/chain-of-thought";
import type { MessagePartStatus } from "../../types/message";
import type { PartMethods } from "../scopes/part";

const COMPLETE_STATUS: MessagePartStatus = Object.freeze({
  type: "complete",
});

const useChainOfThoughtClient = ({
  parts,
  getMessagePart,
}: {
  parts: readonly ChainOfThoughtPart[];
  getMessagePart: (selector: { index: number }) => PartMethods;
}): ClientOutput<"chainOfThought"> => {
  const [collapsed, setCollapsed] = useState(true);

  const status = useMemo(() => {
    const lastPart = parts[parts.length - 1];
    return lastPart?.status ?? COMPLETE_STATUS;
  }, [parts]);

  const state = useMemo<ChainOfThoughtState>(
    () => ({ parts, collapsed, status }),
    [parts, collapsed, status],
  );

  return {
    getState: () => state,
    setCollapsed,
    part: getMessagePart,
  };
};

export const ChainOfThoughtClient = resource(useChainOfThoughtClient);
