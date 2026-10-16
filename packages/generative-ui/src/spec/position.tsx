import * as React from "react";

let positionContext: React.Context<string> | undefined;

// Spec catalogs are also imported under React's server condition, which has no createContext.
const getPositionContext = () => (positionContext ??= React.createContext(""));

/** The rendering element's place in the spec tree: a `/branch.index` step per level, empty for the root element and outside spec mode. */
export const useSpecPosition = () => React.useContext(getPositionContext());

/** Gives each element in one branch of a component's rendered children, including each repeated item's elements, its place in that branch. */
export function positionChildren(
  children: React.ReactNode,
  branch: string,
): React.ReactNode {
  const PositionContext = getPositionContext();
  return React.Children.map(children, (child, index) => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child))
      return child;
    const position = `${branch}.${index}`;
    return child.type === React.Fragment ? (
      React.cloneElement(
        child,
        undefined,
        positionChildren(child.props.children, position),
      )
    ) : (
      <PositionContext.Provider value={position}>
        {child}
      </PositionContext.Provider>
    );
  });
}
