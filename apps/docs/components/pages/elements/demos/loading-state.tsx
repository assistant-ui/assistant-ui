"use client";

import {
  GenerationLoader,
  type GenerationLoaderVariant,
} from "@/components/elements/loading-state";
import { useElapsed } from "@/components/demo/use-demo";

function LoadingDemo({ variant }: { variant: GenerationLoaderVariant }) {
  const tick = useElapsed(true);

  return <GenerationLoader label="Generating" tick={tick} variant={variant} />;
}

export function GenerationLoaderDemo() {
  return <LoadingDemo variant="dots" />;
}

export function GenerationLoaderSquaresDemo() {
  return <LoadingDemo variant="squares" />;
}

export function GenerationLoaderRoundedDemo() {
  return <LoadingDemo variant="rounded" />;
}
