"use client";

import type { FC, PropsWithChildren } from "react";
import {
  UseComposerIfProps,
  useComposerIf,
} from "../../primitive-hooks/composer/useComposerIf";

type ComposerIfProps = PropsWithChildren<UseComposerIfProps>;

export const ComposerIf: FC<ComposerIfProps> = ({ children, ...query }) => {
  const result = useComposerIf(query);
  return result ? children : null;
};
