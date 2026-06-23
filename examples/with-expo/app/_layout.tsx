import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  type Theme,
} from "@react-navigation/native";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { Platform, Pressable } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import {
  AssistantRuntimeProvider,
  useAui,
  Tools,
} from "@assistant-ui/react-native";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import { useTheme } from "@/hooks/use-theme";
import { Icon } from "@/components/ui/icon";
import { ThreadListDrawer } from "@/components/thread-list/ThreadListDrawer";
import { haptics } from "@/lib/haptics";
import toolkit from "@/components/assistant-ui/tools";

function NewChatButton() {
  const aui = useAui();
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityLabel="New chat"
      hitSlop={8}
      onPress={() => {
        haptics.selection();
        aui.threads().switchToNewThread();
      }}
      style={{ marginRight: 16 }}
    >
      <Icon name="compose" size={22} color={colors.foreground} />
    </Pressable>
  );
}

function DrawerLayout() {
  const { isDark, colors } = useTheme();

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.background,
      text: colors.foreground,
      border: colors.border,
      primary: colors.foreground,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <Drawer
        drawerContent={(props) => <ThreadListDrawer {...props} />}
        screenOptions={{
          headerRight: () => <NewChatButton />,
          headerShadowVisible: false,
          headerTintColor: colors.foreground,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontWeight: "600" },
          drawerType: "front",
          swipeEnabled: true,
          drawerStyle: { backgroundColor: colors.background },
        }}
      >
        <Drawer.Screen name="index" options={{ title: "Chat" }} />
      </Drawer>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // iOS renders SF Symbols, so it never needs the MaterialIcons glyph font.
  const [fontsLoaded] = useFonts(
    Platform.OS === "ios" ? {} : MaterialIcons.font,
  );
  const runtime = useAppRuntime();
  const aui = useAui({
    tools: Tools({ toolkit }),
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AssistantRuntimeProvider runtime={runtime} aui={aui}>
        <DrawerLayout />
      </AssistantRuntimeProvider>
    </GestureHandlerRootView>
  );
}
