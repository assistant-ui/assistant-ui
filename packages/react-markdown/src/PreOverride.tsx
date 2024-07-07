import { createContext, ComponentPropsWithoutRef } from "react";
import { PreComponent } from "./types";

export const PreContext = createContext<Omit<
  ComponentPropsWithoutRef<PreComponent>,
  "children"
> | null>(null);

export const PreOverride: PreComponent = ({ children, ...rest }) => {
  return <PreContext.Provider value={rest}>{children}</PreContext.Provider>;
};
