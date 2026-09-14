import { cn } from "@/lib/utils";
import type { FC } from "react";
import { Pressable, type PressableProps } from "react-native";

export const iconButtonClassName =
  "aui-icon-button active:bg-muted size-7 items-center justify-center rounded-md";

export const iconButtonHitSlop = 10;

// Fills the gap-1 between grouped icon buttons without reaching the neighbor.
export const groupedIconButtonHitSlop = {
  top: 10,
  bottom: 10,
  left: 2,
  right: 2,
};

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
    hitSlop={iconButtonHitSlop}
    className={cn(iconButtonClassName, className)}
    {...props}
  />
);
