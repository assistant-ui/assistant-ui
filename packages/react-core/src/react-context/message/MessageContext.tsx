import { createContext } from "react";
import { Store } from "../../utils/tap-store";
import { UIMessage } from "../../client/types/message-types";

export const MessageContext = createContext<
  Store<UIMessage, undefined> | undefined
>(undefined);
