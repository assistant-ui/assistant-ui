import { TextUIPart } from "../../client/types/message-types";
import { createDerivedStateHook } from "../../utils/store/createDerivedStateHook";
import { usePart } from "./usePart";

export const useTextPart = createDerivedStateHook(
  usePart,
  (part): TextUIPart => {
    if (part.type !== "text") {
      throw new Error(
        `Expected part type to be "text" but got "${part.type}". This hook can only be used with text parts.`
      );
    }
    return part;
  }
);