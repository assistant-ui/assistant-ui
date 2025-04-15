"use client";

import { FC } from "react";
import BaseShikiHighlighter, {
  type ShikiHighlighterProps as BaseShikiProps,
} from "react-shiki";

// Define props for our component based on Assistant UI's needs
type ShikiHighlighterProps = Omit<BaseShikiProps, "addDefaultStyles">;

export const ShikiHighlighter: FC<ShikiHighlighterProps> = ({
  children: code,
  ...props
}) => {
  return (
    <BaseShikiHighlighter
      addDefaultStyles={false}
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