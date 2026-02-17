import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useAui,
  useComposer,
  useComposerSend,
  useComposerCancel,
} from "@assistant-ui/react-native";

export function Composer() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const aui = useAui();
  const text = useComposer((s) => s.text);
  const { send, canSend } = useComposerSend();
  const { cancel, canCancel } = useComposerCancel();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? "rgba(28, 28, 30, 0.8)"
            : "rgba(242, 242, 247, 0.8)",
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
          placeholderTextColor="#8e8e93"
          value={text}
          onChangeText={(newText) => aui.composer().setText(newText)}
          multiline
          maxLength={4000}
          editable={!canCancel}
        />
        {canCancel ? (
          <Pressable
            style={[styles.button, styles.stopButton]}
            onPress={cancel}
          >
            <View style={styles.stopIcon} />
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.button,
              styles.sendButton,
              {
                backgroundColor: canSend
                  ? isDark
                    ? "#0a84ff"
                    : "#007aff"
                  : isDark
                    ? "#3a3a3c"
                    : "#e5e5ea",
              },
            ]}
            onPress={send}
            disabled={!canSend}
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={canSend ? "#ffffff" : "#8e8e93"}
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
