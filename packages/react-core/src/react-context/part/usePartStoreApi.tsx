import { createStoreApiHook } from "../../utils/store/createStoreApiHook";
import { PartContext } from "./PartContext";

export const usePartStoreApi = createStoreApiHook(PartContext);