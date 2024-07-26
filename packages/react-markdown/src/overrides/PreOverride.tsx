import { createContext, ComponentPropsWithoutRef, useContext } from "react";
import { PreComponent } from "./types";

export const PreContext = createContext<Omit<
  ComponentPropsWithoutRef<PreComponent>,
  "children"
> | null>(null);

export const useIsMarkdownCodeBlock = () => {
  return useContext(PreContext) !== null;
};

export const PreOverride: PreComponent = ({ children, ...rest }) => {
  return <PreContext.Provider value={rest}>{children}</PreContext.Provider>;
};
