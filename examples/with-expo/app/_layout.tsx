import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AssistantProvider } from "@assistant-ui/react-native";
import { useAppRuntime } from "@/hooks/use-app-runtime";

function NewChatButton() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handlePress = () => {
    router.push("/thread/new");
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.headerButton,
        {
          opacity: pressed ? 0.6 : 1,
          backgroundColor: pressed
            ? isDark
              ? "rgba(10, 132, 255, 0.1)"
              : "rgba(0, 122, 255, 0.1)"
            : "transparent",
        },
      ]}
    >
      <Ionicons
        name="create-outline"
        size={24}
        color={isDark ? "#0a84ff" : "#007aff"}
      />
    </Pressable>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShadowVisible: false }}>
        <Stack.Screen
          name="index"
          options={{
            title: "Chats",
            headerRight: () => <NewChatButton />,
          }}
        />
        <Stack.Screen name="thread/[id]" options={{ title: "" }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const runtime = useAppRuntime();

  return (
    <AssistantProvider runtime={runtime}>
      <RootLayoutNav />
    </AssistantProvider>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
