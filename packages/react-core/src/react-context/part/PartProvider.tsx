import { ReactNode, useMemo, useContext } from "react";
import { MessageContext } from "../message/MessageContext";
import { mapStore } from "../../utils/store/mapStore";
import { PartContext } from "./PartContext";

export namespace PartProvider {
  export interface Props {
    readonly partIdx: number;
    readonly children: ReactNode;
  }
}

export const PartProvider = ({ partIdx, children }: PartProvider.Props) => {
  const message = useContext(MessageContext);
  if (!message) {
    throw new Error("PartProvider must be used within MessageProvider");
  }

  const part = useMemo(() => {
    return mapStore(message, (msg) => msg?.parts[partIdx]!);
  }, [message, partIdx]);

  return <PartContext.Provider value={part}>{children}</PartContext.Provider>;
};
