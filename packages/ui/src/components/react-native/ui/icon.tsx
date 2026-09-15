import { cn } from "@/lib/utils";
import { useSyncExternalStore } from "react";
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

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

// Server markup carries the Lucide defaults because the class to prop mapping needs a CSSOM, and React hydration never patches that attribute mismatch, so the icon remounts once on the client.
export const Icon = ({ className, ...props }: IconProps) => {
  const isClient = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return (
    <StyledIcon
      key={isClient ? "client" : "server"}
      className={cn("text-foreground size-5", className)}
      {...props}
    />
  );
};
