import * as React from "react";

let depthContext: React.Context<number> | undefined;

// Spec catalogs are also imported under React's server condition, which has no createContext.
const getDepthContext = () => (depthContext ??= React.createContext(0));

/** How many spec elements enclose the caller, counting the element that renders it. */
export const useElementDepth = () => React.useContext(getDepthContext());

/** Renders an element one level below the element around it, so a container can tell its direct child elements from deeper ones. */
export function ElementLevel({ children }: { children: React.ReactNode }) {
  const DepthContext = getDepthContext();
  const depth = React.useContext(DepthContext);
  return (
    <DepthContext.Provider value={depth + 1}>{children}</DepthContext.Provider>
  );
}
