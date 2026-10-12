import { createContext, useContext } from "react";

const PositionContext = createContext<readonly number[]>([]);

export const PositionProvider = PositionContext.Provider;

export function usePosition() {
  return useContext(PositionContext);
}
