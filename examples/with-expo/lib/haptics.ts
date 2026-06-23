import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

const enabled = Platform.OS === "ios" || Platform.OS === "android";

export const haptics = {
  selection() {
    if (enabled) void Haptics.selectionAsync();
  },
  light() {
    if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  success() {
    if (enabled)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
};
