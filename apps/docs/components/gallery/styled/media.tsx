export function StyledImage({
  src,
  alt,
  size,
}: {
  src: string;
  alt: string;
  size?: string | number;
}) {
  const sizeMap: Record<string, string> = {
    sm: "h-16",
    md: "h-32",
    lg: "h-48",
  };
  const h = typeof size === "number" ? { height: `${size}px` } : undefined;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`rounded-lg object-cover ${typeof size === "string" ? (sizeMap[size] ?? "h-auto") : "h-auto"}`}
      style={h}
    />
  );
}

export function StyledDivider({ flush }: { flush?: boolean }) {
  return (
    <div className={`border-t border-current/20 ${flush ? "my-0" : "my-4"}`} />
  );
}
