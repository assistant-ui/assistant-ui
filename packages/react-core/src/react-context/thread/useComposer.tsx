import { createDerivedStateHook } from "../../utils/store/createDerivedStateHook";
import { useThread } from "./useThread";

export const useComposer = createDerivedStateHook(
  useThread,
  (state) => state.composer
);