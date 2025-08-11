import { createContext } from "react";
import { Store } from "../../utils/tap-store";
import { UIPart } from "../../client/types/message-types";

export const PartContext = createContext<Store<UIPart, undefined> | undefined>(
  undefined
);
