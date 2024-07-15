import { FC } from "react";

import { ContentPartPrimitive } from "../primitives";
import { TextContentPartProps } from "../types";
import classNames from "classnames";

const Text: FC<TextContentPartProps> = ({ status }) => {
  return (
    <p
      className={classNames(
        "aui-text",
        status.type === "running" && "aui-text-in-progress",
      )}
    >
      <ContentPartPrimitive.Text />
    </p>
  );
};

const exports = { Text };

export default exports;
