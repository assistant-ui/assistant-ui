import { View } from "react-native";

import {
  SHOWCASE_ELEMENTS,
  type ShowcaseSlug,
} from "@/components/showcase/elements";

export function ShowcaseScreen({ slug }: { slug: ShowcaseSlug }) {
  const entry = SHOWCASE_ELEMENTS.find((element) => element.slug === slug);

  if (!entry) return null;

  const { Demo } = entry;

  return (
    <View className="bg-background flex-1 items-center justify-center p-5">
      <Demo />
    </View>
  );
}
