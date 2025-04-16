"use client";

import { FC } from "react";
import BaseShikiHighlighter, {
  type ShikiHighlighterProps as BaseShikiProps,
} from "react-shiki";

// omit props used for internal config
type ShikiHighlighterProps = Omit<BaseShikiProps, "addDefaultStyles" | "showLanguage">;

export const ShikiHighlighter: FC<ShikiHighlighterProps> = ({
  children: code,
  ...props
}) => {
  return (
    <BaseShikiHighlighter
      addDefaultStyles={false}
      showLanguage={false}
      style={{
        margin: 0,
        width: "100%",
        background: "black",
        padding: "1.5rem 1rem",
      }}
      {...props}
    >
      {code}
    </BaseShikiHighlighter>
  );
};
