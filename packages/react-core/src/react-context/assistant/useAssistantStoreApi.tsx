import { createStoreApiHook } from "../../utils/store/createStoreApiHook";
import { AssistantContext } from "./AssistantContext";

export const useAssistantStoreApi = createStoreApiHook(AssistantContext);