"use client";

import {
  Image,
  ImageActions,
  ImageFilename,
  ImagePreview,
  ImageRoot,
  ImageSource,
  ImageZoom,
} from "@/components/assistant-ui/elements/image";
import { defineStates } from "./types";

const noop = () => {};

const PHOTO =
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80";
const PANORAMA =
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600&q=80";

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "generating",
    label: "Generating",
    note: "The image part is still running, so a spinner holds its place.",
    Component: () => (
      <Image
        type="image"
        image=""
        filename="alpine-lake.png"
        status={{ type: "running" }}
      />
    ),
  },
  {
    key: "content-filter",
    label: "Blocked",
    note: "The provider refused to generate the image.",
    Component: () => (
      <Image
        type="image"
        image=""
        status={{ type: "incomplete", reason: "content-filter" }}
      />
    ),
  },
  {
    key: "error",
    label: "Broken link",
    note: "The image URL fails to load, so a placeholder icon replaces it.",
    Component: () => (
      <Image
        type="image"
        image="https://cdn.acme.dev/uploads/expired/7f3a91c2.png"
        filename="whiteboard-photo.png"
        status={{ type: "complete" }}
      />
    ),
  },
  {
    key: "with-actions",
    label: "With actions",
    note: "A finished image with its source credit and download, copy, and regenerate buttons.",
    Component: () => (
      <ImageRoot>
        <ImageZoom src={PHOTO} alt="Mountain range at sunrise">
          <ImagePreview src={PHOTO} alt="Mountain range at sunrise" />
        </ImageZoom>
        <ImageSource
          label="Unsplash"
          url="https://unsplash.com/photos/mountain-range-at-sunrise"
        />
        <ImageActions
          part={{
            type: "image",
            image: PHOTO,
            filename: "mountain-sunrise.jpg",
          }}
          onRegenerate={noop}
        />
      </ImageRoot>
    ),
  },
  {
    key: "long-content",
    label: "Wide image",
    note: "A wide panorama with a long filename fits a fixed 16:9 frame.",
    Component: () => (
      <ImageRoot size="lg">
        <ImageZoom src={PANORAMA} alt="Lake between mountains">
          <ImagePreview
            src={PANORAMA}
            alt="Lake between mountains"
            ratio="16:9"
            fit="cover"
          />
        </ImageZoom>
        <ImageFilename>
          lake-louise-panorama-banff-national-park-alberta-2026-08-14.jpg
        </ImageFilename>
      </ImageRoot>
    ),
  },
]);
