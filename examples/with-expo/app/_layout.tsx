import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  AssistantProvider,
  ThreadProvider,
  ComposerProvider,
} from "@assistant-ui/react-native";
import { useAppRuntime } from "@/hooks/use-app-runtime";

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShadowVisible: false }}>
        <Stack.Screen name="index" options={{ title: "Chat" }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const runtime = useAppRuntime();

  return (
    <AssistantProvider runtime={runtime}>
      <ThreadProvider runtime={runtime.thread}>
        <ComposerProvider runtime={runtime.thread.composer}>
          <RootLayoutNav />
        </ComposerProvider>
      </ThreadProvider>
    </AssistantProvider>
  );
}
