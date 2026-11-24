import { GithubIcon, GoogleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

/* Brand marks, drawn in the current ink like every other icon. */

type IconProps = Omit<React.ComponentProps<typeof HugeiconsIcon>, "icon">;

function brand(icon: IconSvgElement) {
  return function BrandIcon(props: IconProps) {
    return <HugeiconsIcon icon={icon} strokeWidth={1.6} {...props} />;
  };
}

const icons = {
  google: brand(GoogleIcon),
  github: brand(GithubIcon),
};

export { icons };
export type { IconProps };
