"use client";

import {
  ImageRoot,
  ImagePreview,
  ImageFilename,
} from "@/components/assistant-ui/image";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80";

function VariantRow({
  label,
  variant,
}: {
  label: string;
  variant?: "default" | "muted";
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <div className="flex flex-wrap items-start gap-4">
        <ImageRoot variant={variant} size="sm">
          <ImagePreview src={PLACEHOLDER_IMAGE} alt="Mountain landscape" />
          <ImageFilename>landscape-sm.jpg</ImageFilename>
        </ImageRoot>
        <ImageRoot variant={variant} size="default">
          <ImagePreview src={PLACEHOLDER_IMAGE} alt="Mountain landscape" />
          <ImageFilename>landscape-default.jpg</ImageFilename>
        </ImageRoot>
      </div>
    </div>
  );
}

export function ImageSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-6 overflow-x-auto p-6">
      <VariantRow label="Default" />
      <VariantRow label="Muted" variant="muted" />
    </SampleFrame>
  );
}
