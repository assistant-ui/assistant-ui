import { FC } from "react";
import {
  ContentPartPrimitive,
  TextContentPartProps,
} from "@assistant-ui/react";

export const Text: FC<TextContentPartProps> = ({ status }) => {
  return (
    <p
      className={
        "aui-text" + (status === "in_progress" ? " aui-text-in-progress" : "")
      }
    >
      <ContentPartPrimitive.Text />
    </p>
  );
};
