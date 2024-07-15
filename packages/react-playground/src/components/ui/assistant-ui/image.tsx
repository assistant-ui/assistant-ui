import { ImageContentPartComponent } from "@assistant-ui/react";
import { RemoveContentPartButton } from "./remove-content-part";

export const Image: ImageContentPartComponent = ({ part }) => {
  return (
    <div className="flex justify-between gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={part.image} alt="Image" className="size-20 object-contain" />

      <RemoveContentPartButton />
    </div>
  );
};
