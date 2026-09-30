import { Image } from "@assistant-ui/ui/components/assistant-ui/elements/image.tsx";
import { defineSections } from "../types";
import { IMAGES } from "./_assets";
import { ClickWhenAlone } from "./_open-when-alone";

export default defineSections([
  {
    id: "image",
    title: "Image",
    category: "content",
    notes: "A complete image part (data: SVG) with its file name.",
    render: () => (
      <Image
        type="image"
        image={IMAGES.noon}
        filename="valley-at-noon.svg"
        status={{ type: "complete" }}
      />
    ),
  },
  {
    id: "image-states",
    title: "Image states",
    category: "content",
    notes:
      "Generating (running), blocked by the content filter, and a broken source.",
    render: () => (
      <div className="flex flex-col gap-3">
        <Image
          type="image"
          image=""
          filename="generating.png"
          status={{ type: "running" }}
        />
        <Image
          type="image"
          image={IMAGES.dusk}
          status={{ type: "incomplete", reason: "content-filter" }}
        />
        <Image
          type="image"
          image="data:image/png;base64,AAAA"
          filename="broken.png"
          status={{ type: "complete" }}
        />
      </div>
    ),
  },
  {
    id: "image-zoom",
    title: "Image (zoom open)",
    category: "content",
    notes:
      "The zoom overlay, opened when this section is shown alone (the overlay is fixed and would cover the gallery).",
    render: () => (
      <ClickWhenAlone id="image-zoom" selector=".aui-image-zoom-trigger">
        <Image
          type="image"
          image={IMAGES.dawn}
          filename="dawn.svg"
          status={{ type: "complete" }}
        />
      </ClickWhenAlone>
    ),
  },
]);
