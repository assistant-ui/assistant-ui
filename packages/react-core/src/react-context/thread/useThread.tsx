import { createStoreStateHook } from "../../utils/store/createStoreStateHook";
import { ThreadContext } from "./ThreadContext";

export const useThread = createStoreStateHook(ThreadContext);
