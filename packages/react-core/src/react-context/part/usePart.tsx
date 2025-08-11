import { createStoreStateHook } from "../../utils/store/createStoreStateHook";
import { PartContext } from "./PartContext";

export const usePart = createStoreStateHook(PartContext);
