"use client";

import { FC } from "react";
import { ContentPartPrimitive } from "../primitives";
import { useSmoothStatus, withSmoothContextProvider } from "../utils/smooth";
import classNames from "classnames";

export const Text: FC = () => {
  const status = useSmoothStatus();
  return (
    <ContentPartPrimitive.Text
      className={classNames(
        "aui-text",
        status.type === "running" && "aui-text-running",
      )}
      component="p"
    />
  );
};

const exports = { Text: withSmoothContextProvider(Text) };

export default exports;
