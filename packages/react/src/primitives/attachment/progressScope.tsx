import { createContext } from "react";
import { createContextHook } from "../../context/react/utils/createContextHook";

export type ProgressContextValue = {
  value: number;
  max: number;
};

export const ProgressContext = createContext<ProgressContextValue | null>(null);

export const useProgressContext = createContextHook(
  ProgressContext,
  "AttachmentPrimitive.ProgressRoot",
);
