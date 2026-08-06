import { useMemo, useState } from "react";
import { resource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import type {
  ChainOfThoughtState,
  ChainOfThoughtPart,
} from "../scopes/chain-of-thought";
import type { PartMethods } from "../scopes/part";
import { getGroupStatus } from "../../utils/getGroupStatus";

const useChainOfThoughtClient = ({
  parts,
  getMessagePart,
}: {
  parts: readonly ChainOfThoughtPart[];
  getMessagePart: (selector: { index: number }) => PartMethods;
}): ClientOutput<"chainOfThought"> => {
  const [collapsed, setCollapsed] = useState(true);

  const status = useMemo(() => {
    return getGroupStatus(parts);
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
