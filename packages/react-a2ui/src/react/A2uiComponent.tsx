import { useCallback, type ReactNode } from "react";
import { useA2uiContext } from "./A2uiContext";
import type { A2uiComponentDef } from "../types";

export type A2uiComponentExternalProps = {
  def: A2uiComponentDef;
  surfaceId: string;
  allComponents?: A2uiComponentDef[];
};

export const A2uiComponent = ({
  def,
  surfaceId,
  allComponents,
}: A2uiComponentExternalProps) => {
  const { components, dataStore, onAction } = useA2uiContext();
  const Component = components[def.type];
  if (!Component) return null;

  const getData = useCallback(
    (path: string) => dataStore.getData(surfaceId, path),
    [dataStore, surfaceId],
  );

  let children: ReactNode = null;
  if (def.children?.length && allComponents) {
    const childMap = new Map(allComponents.map((c) => [c.id, c]));
    children = def.children
      .map((childId) => childMap.get(childId))
      .filter((c): c is A2uiComponentDef => c != null)
      .map((childDef) => (
        <A2uiComponent
          key={childDef.id}
          def={childDef}
          surfaceId={surfaceId}
          allComponents={allComponents}
        />
      ));
  }

  return (
    <Component
      def={def}
      surfaceId={surfaceId}
      getData={getData}
      onAction={onAction}
    >
      {children}
    </Component>
  );
};
