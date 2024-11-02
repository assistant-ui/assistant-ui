"use client";

import type { FC, PropsWithChildren } from "react";
import {
  UseComposerIfProps,
  useComposerIf,
} from "../../primitive-hooks/composer/useComposerIf";

export namespace ComposerPrimitiveIf {
  export type Props = PropsWithChildren<UseComposerIfProps>;
}

export const ComposerPrimitiveIf: FC<ComposerPrimitiveIf.Props> = ({
  children,
  ...query
}) => {
  const result = useComposerIf(query);
  return result ? children : null;
};

ComposerPrimitiveIf.displayName = "ComposerPrimitive.If";
