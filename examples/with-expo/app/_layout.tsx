import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { Pressable, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import {
  AssistantProvider,
  useAssistantRuntime,
} from "@assistant-ui/react-native";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { ThreadListDrawer } from "@/components/thread-list/ThreadListDrawer";

function NewChatButton() {
  const runtime = useAssistantRuntime();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Pressable
      onPress={() => {
        runtime.threads.switchToNewThread();
      }}
      style={{ marginRight: 16 }}
    >
      <Ionicons
        name="create-outline"
        size={24}
        color={isDark ? "#ffffff" : "#000000"}
      />
    </Pressable>
  );
}

function DrawerLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Drawer
        drawerContent={(props) => <ThreadListDrawer {...props} />}
        screenOptions={{
          headerRight: () => <NewChatButton />,
          drawerType: "front",
          swipeEnabled: true,
        }}
      >
        <Drawer.Screen name="index" options={{ title: "Chat" }} />
      </Drawer>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const runtime = useAppRuntime();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AssistantProvider runtime={runtime}>
        <DrawerLayout />
      </AssistantProvider>
    </GestureHandlerRootView>
  );
}
