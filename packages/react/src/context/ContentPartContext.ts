import { createContext, useContext } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import type { ContentPartState } from "./stores/ContentPart";

export type ContentPartContextValue = {
  useContentPart: UseBoundStore<StoreApi<ContentPartState>>;
};

export const ContentPartContext = createContext<ContentPartContextValue | null>(
  null,
);

export const useContentPartContext = (): ContentPartContextValue => {
  const context = useContext(ContentPartContext);
  if (!context)
    throw new Error(
      "This component must be used within a ContentPartPrimitive.Provider.",
    );
  return context;
};
