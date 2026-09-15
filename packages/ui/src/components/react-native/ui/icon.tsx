import { cn } from "@/lib/utils";
import { useSyncExternalStore } from "react";
import type { LucideIcon, LucideProps } from "lucide-react-native";
import { withUniwind } from "uniwind";

export type IconProps = LucideProps & {
  as: LucideIcon;
  className?: string;
};

type IconImplProps = IconProps & {
  iconClassName?: string;
};

const IconImpl = ({
  as: Component,
  iconClassName,
  ...props
}: IconImplProps) => <Component {...props} className={iconClassName} />;

const StyledIcon = withUniwind(IconImpl, {
  size: { fromClassName: "className", styleProperty: "width" },
  color: { fromClassName: "className", styleProperty: "color" },
});

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

// The class to prop mapping reads the CSSOM, which the server does not have, and hydration never patches the resulting attribute mismatch, so the classes apply from the first render after hydration.
export const Icon = ({ className, ...props }: IconProps) => {
  const hydrated = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const iconClassName = cn("text-foreground size-5", className);

  return (
    <StyledIcon
      className={hydrated ? iconClassName : undefined}
      iconClassName={iconClassName}
      {...props}
    />
  );
};
