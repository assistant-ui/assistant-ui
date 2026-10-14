import {
  Children,
  cloneElement,
  createContext,
  Fragment,
  isValidElement,
  useContext,
  type ReactNode,
} from "react";

const SpecPosition = createContext<string | undefined>(undefined);

/** The rendering element's place in the spec tree as dot-separated indices; undefined for the root element and outside spec mode. */
export const useSpecPosition = () => useContext(SpecPosition);

/** Gives each element in a component's rendered children, and in each repeated item, its place under `base`. */
export function positionChildren(children: ReactNode, base: string): ReactNode {
  return Children.map(children, (child, index) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return child;
    const position = `${base}.${index}`;
    return child.type === Fragment ? (
      cloneElement(
        child,
        undefined,
        positionChildren(child.props.children, position),
      )
    ) : (
      <SpecPosition.Provider value={position}>{child}</SpecPosition.Provider>
    );
  });
}
