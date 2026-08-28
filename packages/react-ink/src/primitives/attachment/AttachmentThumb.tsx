import type { ComponentProps, FC } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type AttachmentThumbProps = ComponentProps<typeof Text>;

export const AttachmentThumb: FC<AttachmentThumbProps> = ({
  children,
  ...textProps
}) => {
  const label = useAuiState("attachment", (s) => {
    const name = s.name;
    const dot = name.lastIndexOf(".");
    if (dot > 0 && dot < name.length - 1) {
      return `.${name.slice(dot + 1)}`;
    }
    return s.type;
  });
  return <Text {...textProps}>{children ?? label}</Text>;
};
