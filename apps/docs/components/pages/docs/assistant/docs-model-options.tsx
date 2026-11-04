import { useMemo } from "react";
import Image from "next/image";
import { MODELS } from "@/lib/model";
import { useSession } from "@/lib/session";

export function docsModelOptions({ signedIn }: { signedIn: boolean }) {
  return MODELS.map((model) => {
    const locked =
      !signedIn && "signInRequired" in model && model.signInRequired;
    return {
      id: model.value,
      name: model.name,
      icon: (
        <Image
          src={model.icon}
          alt={model.name}
          width={14}
          height={14}
          className="size-3.5"
        />
      ),
      ...(model.disabled || locked ? { disabled: true as const } : undefined),
      ...(locked ? { description: "Sign in to use" } : undefined),
    };
  });
}

export function useDocsModelOptions() {
  const signedIn = useSession().status === "signed-in";
  return useMemo(() => docsModelOptions({ signedIn }), [signedIn]);
}
