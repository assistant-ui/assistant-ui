import Image from "next/image";
import { MODELS } from "@/constants/model";

export function docsModelOptions() {
  return MODELS.map((model) => ({
    id: model.value,
    name: model.name,
    icon: (
      <Image
        src={model.icon}
        alt={model.name}
        width={16}
        height={16}
        className="size-4"
      />
    ),
    ...(model.disabled ? { disabled: true as const } : undefined),
  }));
}
