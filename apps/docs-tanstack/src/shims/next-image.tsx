import type { ComponentProps } from "react";
type Src = string | { src: string; width?: number; height?: number };
export type StaticImageData = { src: string; width: number; height: number };
export default function Image({
  src,
  priority: _p,
  fill: _f,
  quality: _q,
  placeholder: _ph,
  blurDataURL: _b,
  unoptimized: _u,
  ...rest
}: Omit<ComponentProps<"img">, "src"> & {
  src: Src;
  priority?: boolean;
  fill?: boolean;
  quality?: number;
  placeholder?: string;
  blurDataURL?: string;
  unoptimized?: boolean;
}) {
  const s = typeof src === "string" ? src : src.src;
  return <img src={s} {...rest} />;
}
