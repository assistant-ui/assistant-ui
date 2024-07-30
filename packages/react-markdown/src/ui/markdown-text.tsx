import { FC, memo } from "react";
import { CodeHeader } from "./code-header";
import classNames from "classnames";
import {
  MarkdownTextPrimitive,
  MarkdownTextPrimitiveProps,
} from "../primitives/MarkdownText";
import { INTERNAL } from "@assistant-ui/react";

const { withSmoothContextProvider, useSmoothStatus } = INTERNAL;

export type MakeMarkdownTextProps = MarkdownTextPrimitiveProps;

export const makeMarkdownText = ({
  className,
  components: userComponents,
  ...rest
}: MakeMarkdownTextProps = {}) => {
  const components = {
    ...userComponents,
    CodeHeader: userComponents?.CodeHeader ?? CodeHeader,
  };

  const MarkdownTextImpl: FC = () => {
    const status = useSmoothStatus();
    return (
      <MarkdownTextPrimitive
        components={components}
        {...rest}
        className={classNames(
          "aui-md-root",
          status.type === "running" && "aui-md-running",
          className,
        )}
      />
    );
  };
  MarkdownTextImpl.displayName = "MarkdownText";

  return memo(withSmoothContextProvider(MarkdownTextImpl), () => true);
};
