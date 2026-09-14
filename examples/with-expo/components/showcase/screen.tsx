import { useSyncExternalStore } from "react";
import { View } from "react-native";

import {
  SHOWCASE_ELEMENTS,
  type ShowcaseSlug,
} from "@/components/showcase/elements";

const subscribe = () => () => {};

// On the web, components hydrated from the static HTML resolve their className
// before Uniwind has indexed the stylesheet and keep the defaults, so the demo
// mounts after hydration instead.
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
