import { createStoreApiHook } from "../../utils/store/createStoreApiHook";
import { ThreadContext } from "./ThreadContext";

export const useThreadStoreApi = createStoreApiHook(ThreadContext);