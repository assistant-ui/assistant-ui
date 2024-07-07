import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { TextContentPartProps } from "@assistant-ui/react";
import { CodeHeader } from "./code/code-header";
import { MarkdownTextPrimitiveProps } from "@assistant-ui/react-markdown";
import { FC, memo } from "react";

type MakeMarkdownTextProps = MarkdownTextPrimitiveProps;

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
        className={
          "aui-md-root" +
          (status === "in_progress" ? " aui-md-in-progress" : "") +
          (!!className ? " " + className : "")
        }
      >
        <MarkdownTextPrimitive components={components} {...rest} />
      </div>
    );
  };
  MarkdownTextImpl.displayName = "MarkdownText";

  return memo(MarkdownTextImpl, (prev, next) => prev.status === next.status);
};
