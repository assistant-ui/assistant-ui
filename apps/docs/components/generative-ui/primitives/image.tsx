import { cn } from "@/lib/utils";

export function Image({
  src,
  size = 40,
  alt = "",
  rounded = true,
}: {
  src: string;
  size?: number;
  alt?: string;
  rounded?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn("object-cover", rounded && "rounded-md")}
    />
  );
}
