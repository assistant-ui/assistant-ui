"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";

export namespace ArtifactPrimitiveRoot {
  export type Element = HTMLDivElement;
  export type Props = ComponentPropsWithoutRef<"div">;
}

export const ArtifactPrimitiveRoot = forwardRef<
  ArtifactPrimitiveRoot.Element,
  ArtifactPrimitiveRoot.Props
>((props, ref) => <div {...props} ref={ref} />);

ArtifactPrimitiveRoot.displayName = "ArtifactPrimitive.Root";
