"use client";

import type { FC, PropsWithChildren } from "react";
import {
  UseComposerIfProps,
  useComposerIf,
} from "../../primitive-hooks/composer/useComposerIf";

export type ComposerPrimitiveIfProps = PropsWithChildren<UseComposerIfProps>;

export const ComposerPrimitiveIf: FC<ComposerPrimitiveIfProps> = ({
  children,
  ...query
}) => {
  const result = useComposerIf(query);
  return result ? children : null;
};

ComposerPrimitiveIf.displayName = "ComposerPrimitive.If";
