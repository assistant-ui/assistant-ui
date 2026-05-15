import Image, { type ImageProps } from "next/image";

type AdkIconProps = Omit<ImageProps, "alt" | "src"> & {
  alt?: string;
};

export function AdkIcon({ alt = "", ...props }: AdkIconProps) {
  return (
    <Image
      aria-hidden="true"
      alt={alt}
      {...props}
      src="/icons/agent-development-kit.png"
    />
  );
}
