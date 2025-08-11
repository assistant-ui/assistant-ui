import { createStoreApiHook } from "../../utils/store/createStoreApiHook";
import { MessageContext } from "./MessageContext";

export const useMessageStoreApi = createStoreApiHook(MessageContext);