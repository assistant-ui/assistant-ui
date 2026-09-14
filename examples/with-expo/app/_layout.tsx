import "../global.css";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  type Theme,
} from "expo-router";
import { Drawer, type DrawerContentComponentProps } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { Pressable, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SquarePenIcon } from "lucide-react-native";
import { useCSSVariable, useUniwind } from "uniwind";

import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  Tools,
  useAui,
  useAuiEvent,
} from "@assistant-ui/react-native";
import { ThreadList } from "@/components/assistant-ui/elements/thread-list.aui";
import { Icon } from "@/components/ui/icon";
import toolkit from "@/components/tools";
import { useAppRuntime } from "@/hooks/use-app-runtime";

function NewChatButton() {
  const aui = useAui();

  return (
    <Pressable
      accessibilityLabel="New chat"
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => aui.threads.switchToNewThread()}
      className="mr-4"
    >
      <Icon as={SquarePenIcon} className="text-foreground size-[22px]" />
    </Pressable>
  );
}

function DrawerContent({ navigation }: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  useAuiEvent("threads.selectionChanged", () => navigation.closeDrawer());

  return (
    <View
      className="bg-background flex-1"
      style={{ paddingTop: insets.top + 12 }}
    >
      <ThreadList />
    </View>
  );
}

function DrawerLayout() {
  const { theme } = useUniwind();
  const [background, foreground, border] = useCSSVariable([
    "--color-background",
    "--color-foreground",
    "--color-border",
  ]);

  const base = theme === "dark" ? DarkTheme : DefaultTheme;
  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      background: String(background),
      card: String(background),
      text: String(foreground),
      border: String(border),
      primary: String(foreground),
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <Drawer
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={{
          headerRight: () => <NewChatButton />,
          headerShadowVisible: false,
          headerTintColor: String(foreground),
          headerStyle: { backgroundColor: String(background) },
          headerTitleStyle: { fontWeight: "600" },
          drawerType: "front",
          swipeEnabled: true,
          drawerStyle: { backgroundColor: String(background) },
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
  const config = AuiConfig({
    tools: Tools({ toolkit }),
    suggestions: Suggestions([
      {
        title: "What's the weather",
        label: "in Tokyo?",
        prompt: "What's the weather in Tokyo?",
      },
      {
        title: "Tell me a joke",
        label: "to make me laugh",
        prompt: "Tell me a joke",
      },
      {
        title: "Help me write",
        label: "an email",
        prompt: "Help me write an email",
      },
    ]),
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AssistantRuntimeProvider runtime={runtime} config={config}>
        <DrawerLayout />
      </AssistantRuntimeProvider>
    </GestureHandlerRootView>
  );
}
