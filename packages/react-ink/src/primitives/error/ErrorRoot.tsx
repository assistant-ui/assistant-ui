import type { ComponentProps, ReactNode } from "react";
import { Box, Text } from "ink";

export type ErrorRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
  icon?: ReactNode;
};

const DefaultIcon = () => <Text color="red">x</Text>;

export const ErrorRoot = ({
  children,
  icon,
  gap = 1,
  ...props
}: ErrorRootProps) => {
  return (
    <Box gap={gap} {...props}>
      {icon ?? <DefaultIcon />}
      {children}
    </Box>
  );
};

ErrorRoot.displayName = "ErrorPrimitive.Root";
