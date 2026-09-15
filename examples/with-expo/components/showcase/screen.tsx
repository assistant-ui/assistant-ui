import { useSyncExternalStore } from "react";
import { View } from "react-native";

import {
  SHOWCASE_ELEMENTS,
  type ShowcaseSlug,
} from "@/components/showcase/elements";

const subscribe = () => () => {};

// Class to prop mappings (icon size and color, placeholder color) resolve to nothing in the static HTML because the server has no CSSOM, and React hydration never patches that mismatch, so the demo mounts after hydration instead.
const useHydrated = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

export function ShowcaseScreen({ slug }: { slug: ShowcaseSlug }) {
  const hydrated = useHydrated();
  const entry = SHOWCASE_ELEMENTS.find((element) => element.slug === slug);

  if (!entry) return null;

  const { Demo } = entry;

  return (
    <View className="bg-background flex-1 items-center justify-center p-5">
      {hydrated ? <Demo /> : null}
    </View>
  );
}
