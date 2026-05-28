import { useCallback, useMemo, type ReactNode } from "react";
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
  const { getComponent, dataStore, onAction } = useA2uiContext();

  const getData = useCallback(
    (path: string) => dataStore.getData(surfaceId, path),
    [dataStore, surfaceId],
  );

  const childMap = useMemo(
    () =>
      allComponents ? new Map(allComponents.map((c) => [c.id, c])) : undefined,
    [allComponents],
  );

  const Component = getComponent(def.type);
  if (!Component) return null;

  let children: ReactNode = null;
  if (def.children?.length && childMap) {
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
