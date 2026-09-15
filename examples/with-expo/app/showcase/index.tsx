import { Link } from "expo-router";
import { Text, View } from "react-native";

import { SHOWCASE_ELEMENTS } from "@/components/showcase/elements";

export default function ShowcaseIndex() {
  return (
    <View className="bg-background flex-1 gap-3 p-5">
      {SHOWCASE_ELEMENTS.map(({ slug, title }) => (
        <Link key={slug} href={`/showcase/${slug}`}>
          <Text className="text-foreground">{title}</Text>
        </Link>
      ))}
    </View>
  );
}
