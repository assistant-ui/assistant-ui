import { createStoreStateHook } from "../../utils/store/createStoreStateHook";
import { MessageContext } from "./MessageContext";

export const useMessage = createStoreStateHook(MessageContext);