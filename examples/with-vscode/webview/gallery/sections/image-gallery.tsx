import {
  ImageGallery,
  type GalleryImage,
} from "@assistant-ui/ui/components/assistant-ui/elements/image-gallery.tsx";
import { defineSections } from "../types";
import { IMAGES } from "./_assets";
import { ClickWhenAlone } from "./_open-when-alone";

const GALLERY: readonly GalleryImage[] = [
  {
    id: "dawn",
    src: IMAGES.dawn,
    alt: "Hills under a pink dawn sky",
    caption: "Dawn over the ridge.",
    source: { label: "Gallery fixtures", url: "https://www.assistant-ui.com/" },
  },
  {
    id: "noon",
    src: IMAGES.noon,
    alt: "Green valley at noon",
    caption: "Noon in the valley.",
  },
  { id: "dusk", src: IMAGES.dusk, alt: "Orange dusk over dark hills" },
  { id: "night", src: IMAGES.night, alt: "Moonlit hills at night" },
  { id: "mist", src: IMAGES.mist, alt: "Grey hills in the mist" },
];

export default defineSections([
  {
    id: "image-gallery",
    title: "Image gallery",
    category: "content",
    notes: "Five images, three visible; the last tile counts the rest.",
    render: () => <ImageGallery images={GALLERY} maxVisible={3} />,
  },
  {
    id: "image-gallery-lightbox",
    title: "Image gallery (lightbox open)",
    category: "content",
    notes:
      "The first image in the lightbox dialog, opened when this section is shown alone.",
    render: () => (
      <ClickWhenAlone
        id="image-gallery-lightbox"
        selector='[data-slot="image-gallery"] button'
        className="min-h-screen"
      >
        <ImageGallery images={GALLERY} maxVisible={3} />
      </ClickWhenAlone>
    ),
  },
]);
