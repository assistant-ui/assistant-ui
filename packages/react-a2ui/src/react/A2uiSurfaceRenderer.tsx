import { useMemo } from "react";
import { useA2uiSurfaces } from "../hooks/useA2uiSurfaces";
import { useA2uiSurface } from "../hooks/useA2uiSurface";
import { A2uiComponent } from "./A2uiComponent";
import type { A2uiComponentDef } from "../types";

export type A2uiSurfaceRendererProps = {
  surfaceId?: string;
  className?: string;
};

function getRootComponents(components: A2uiComponentDef[]): A2uiComponentDef[] {
  const childIds = new Set<string>();
  for (const comp of components) {
    if (comp.children) {
      for (const id of comp.children) {
        childIds.add(id);
      }
    }
  }
  return components.filter((c) => !childIds.has(c.id));
}

const SingleSurface = ({
  surfaceId,
  className,
}: {
  surfaceId: string;
  className?: string;
}) => {
  const surface = useA2uiSurface(surfaceId);
  const roots = useMemo(
    () => (surface ? getRootComponents(surface.components) : []),
    [surface],
  );
  if (!surface) return null;

  return (
    <div
      data-a2ui-surface={surfaceId}
      {...(className !== undefined ? { className } : {})}
    >
      {roots.map((def) => (
        <A2uiComponent
          key={def.id}
          def={def}
          surfaceId={surfaceId}
          allComponents={surface.components}
        />
      ))}
    </div>
  );
};

const AllSurfaces = ({ className }: { className?: string }) => {
  const surfaces = useA2uiSurfaces();
  return (
    <>
      {surfaces.map((surface) => (
        <SingleSurface
          key={surface.surfaceId}
          surfaceId={surface.surfaceId}
          {...(className !== undefined ? { className } : {})}
        />
      ))}
    </>
  );
};

export const A2uiSurfaceRenderer = ({
  surfaceId,
  className,
}: A2uiSurfaceRendererProps) => {
  if (surfaceId) {
    return (
      <SingleSurface
        surfaceId={surfaceId}
        {...(className !== undefined ? { className } : {})}
      />
    );
  }
  return <AllSurfaces {...(className !== undefined ? { className } : {})} />;
};
