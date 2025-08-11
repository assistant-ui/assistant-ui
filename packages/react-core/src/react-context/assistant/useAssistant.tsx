import { createStoreStateHook } from "../../utils/store/createStoreStateHook";
import { AssistantContext } from "./AssistantContext";

export const useAssistant = createStoreStateHook(AssistantContext);
