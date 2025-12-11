import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComposerRuntime } from "@assistant-ui/react-native";

type ChatComposerProps = {
  composerRuntime: ComposerRuntime;
  text: string;
  canSend: boolean;
  isRunning: boolean;
};

export function ChatComposer({
  composerRuntime,
  text,
  canSend,
  isRunning,
}: ChatComposerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleSend = () => {
    if (canSend && !isRunning) {
      composerRuntime.send();
    }
  };

  const handleCancel = () => {
    if (isRunning) {
      composerRuntime.cancel();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#000000" : "#f2f2f7",
          borderTopColor: isDark ? "#2c2c2e" : "#e5e5ea",
        },
      ]}
    >
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: isDark ? "#1c1c1e" : "#ffffff",
            borderColor: isDark ? "#3a3a3c" : "#e5e5ea",
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: isDark ? "#ffffff" : "#000000" }]}
          placeholder="Message..."
          placeholderTextColor={isDark ? "#8e8e93" : "#8e8e93"}
          value={text}
          onChangeText={(newText) => composerRuntime.setText(newText)}
          multiline
          maxLength={4000}
          editable={!isRunning}
        />
        {isRunning ? (
          <Pressable
            style={[styles.button, styles.stopButton]}
            onPress={handleCancel}
          >
            <View style={styles.stopIcon} />
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.button,
              styles.sendButton,
              {
                backgroundColor:
                  canSend && !isRunning
                    ? isDark
                      ? "#0a84ff"
                      : "#007aff"
                    : isDark
                      ? "#3a3a3c"
                      : "#e5e5ea",
              },
            ]}
            onPress={handleSend}
            disabled={!canSend || isRunning}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={canSend ? "#ffffff" : isDark ? "#8e8e93" : "#8e8e93"}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    paddingVertical: 6,
    letterSpacing: -0.2,
  },
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButton: {},
  stopButton: {
    backgroundColor: "#ff453a",
  },
  stopIcon: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: "#ffffff",
  },
});
