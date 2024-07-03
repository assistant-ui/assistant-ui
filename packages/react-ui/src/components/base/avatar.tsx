"use client";

import type { FC } from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { styled } from "../../styled";

export type AvatarProps = {
  src?: string | undefined;
  alt?: string | undefined;
  fallback?: string | undefined;
};

export const Avatar: FC<AvatarProps> = ({ src, alt, fallback }) => {
  if (src == null && fallback == null) return null;

  return (
    <AvatarRoot>
      {src != null && <AvatarImage src={src} alt={alt} />}
      {fallback != null && <AvatarFallback>{fallback}</AvatarFallback>}
    </AvatarRoot>
  );
};

Avatar.displayName = "Avatar";

export const AvatarRoot = styled(AvatarPrimitive.Root, {
  className: "aui-avatar-root",
});

AvatarRoot.displayName = "AvatarRoot";

export const AvatarImage = styled(AvatarPrimitive.Image, {
  className: "aui-avatar-image",
});

AvatarImage.displayName = "AvatarImage";

export const AvatarFallback = styled(AvatarPrimitive.Fallback, {
  className: "aui-avatar-fallback",
});

AvatarFallback.displayName = "AvatarFallback";
