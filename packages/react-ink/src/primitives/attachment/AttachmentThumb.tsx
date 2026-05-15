import type { ComponentProps, FC } from "react";
import { Text } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type AttachmentThumbProps = ComponentProps<typeof Text>;

export const AttachmentThumb: FC<AttachmentThumbProps> = (props) => {
  const label = useAuiState((s) => {
    const name = s.attachment.name;
    const dot = name.lastIndexOf(".");
    if (dot > 0 && dot < name.length - 1) {
      return `.${name.slice(dot + 1)}`;
    }
    const type = s.attachment.type;
    if (type !== "file") return type;
    return "file";
  });
  return <Text {...props}>{label}</Text>;
};
