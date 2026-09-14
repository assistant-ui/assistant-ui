import { cn } from "@/lib/utils";
import type { FC } from "react";
import { Pressable, type PressableProps } from "react-native";

export const iconButtonClassName =
  "aui-icon-button active:bg-muted size-7 items-center justify-center rounded-md";

export type IconButtonProps = Omit<PressableProps, "accessibilityLabel"> & {
  label: string;
  className?: string;
};

export const IconButton: FC<IconButtonProps> = ({
  label,
  className,
  ...props
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={4}
    className={cn(iconButtonClassName, className)}
    {...props}
  />
);
