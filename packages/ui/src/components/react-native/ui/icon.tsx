import { cn } from "@/lib/utils";
import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import type { LucideIcon, LucideProps } from "lucide-react-native";
import { withUniwind } from "uniwind";

export type IconProps = LucideProps & {
  as: LucideIcon;
  className?: string;
};

const IconImpl = ({ as: Component, ...props }: IconProps) => (
  <Component {...props} />
);

const StyledIcon = withUniwind(IconImpl, {
  size: { fromClassName: "className", styleProperty: "width" },
  color: { fromClassName: "className", styleProperty: "color" },
});

const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => Platform.OS === "web";
const getServerHydrationSnapshot = () => false;

export const Icon = ({ className, ...props }: IconProps) => {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  return (
    <StyledIcon
      key={isHydrated ? "hydrated" : undefined}
      className={cn("text-foreground size-5", className)}
      {...props}
    />
  );
};
