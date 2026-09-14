import { cn } from "@/lib/utils";
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

export const Icon = ({ className, ...props }: IconProps) => (
  <StyledIcon className={cn("text-foreground size-5", className)} {...props} />
);
