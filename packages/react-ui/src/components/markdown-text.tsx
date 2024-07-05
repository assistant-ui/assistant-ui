import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { FC } from "react";
import { MarkdownTextPrimitiveProps } from "@assistant-ui/react-markdown";
import { TextContentPartProps } from "@assistant-ui/react";

type MarkdownTextProps = Partial<MarkdownTextPrimitiveProps>;

export const makeMarkdownText = ({
  className,
  ...rest
}: MarkdownTextProps = {}) => {
  const MarkdownTextImpl: FC<TextContentPartProps> = ({ status }) => {
    return (
      <MarkdownTextPrimitive
        className={
          "aui-md-root" +
          (status === "in_progress" ? " aui-md aui-md-in-progress" : "") +
          (!!className ? " " + className : "")
        }
        {...rest}
      />
    );
  };
  MarkdownTextImpl.displayName = "MarkdownText";

  return MarkdownTextImpl;
};
