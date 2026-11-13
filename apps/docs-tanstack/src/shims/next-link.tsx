import { forwardRef, type ComponentProps } from "react";
type Props = Omit<ComponentProps<"a">, "href"> & {
  href?: string | { pathname?: string };
  prefetch?: unknown;
  replace?: boolean;
  scroll?: boolean;
};
const Link = forwardRef<HTMLAnchorElement, Props>(function Link(
  { href, prefetch: _p, replace: _r, scroll: _s, ...rest },
  ref,
) {
  const url = typeof href === "string" ? href : (href?.pathname ?? "#");
  return <a ref={ref} href={url} {...rest} />;
});
export default Link;
