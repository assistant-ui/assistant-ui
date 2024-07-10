import { TextContentPartProps } from "@assistant-ui/react";
import { FC, memo } from "react";
import { CodeHeader } from "./code-header";
import classNames from "classnames";
import {
  MarkdownTextPrimitive,
  MarkdownTextPrimitiveProps,
} from "../primitives/MarkdownText";

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

  const MarkdownTextImpl: FC<TextContentPartProps> = ({ status }) => {
    return (
      <div
        className={classNames(
          "aui-md-root",
          status.type === "in_progress" && "aui-md-in-progress",
          className,
        )}
      >
        <MarkdownTextPrimitive components={components} {...rest} />
      </div>
    );
  };
  MarkdownTextImpl.displayName = "MarkdownText";

  return memo(
    MarkdownTextImpl,
    (prev, next) => prev.status.type === next.status.type,
  );
};
