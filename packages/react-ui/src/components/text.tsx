import { FC } from "react";
import {
  ContentPartPrimitive,
  TextContentPartProps,
} from "@assistant-ui/react";
import { classNames } from "../utils/withDefaults";

export const Text: FC<TextContentPartProps> = ({ status }) => {
  return (
    <p
      className={classNames(
        "aui-text",
        status.type === "in_progress" && "aui-text-in-progress",
      )}
    >
      <ContentPartPrimitive.Text />
    </p>
  );
};
