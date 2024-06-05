import { createContext, useContext } from "react";
import type { ContentPartStore } from "./stores/ContentPartTypes";

export const ContentPartContext = createContext<ContentPartStore | null>(null);

export const useContentPartContext = () => {
  const context = useContext(ContentPartContext);
  if (!context)
    throw new Error(
      "This component must be used within a ContentPartPrimitive.Provider.",
    );
  return context;
};
