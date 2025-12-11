import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";
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
  const backgroundColor = useThemeColor(
    { light: "#f5f5f5", dark: "#1a1a1a" },
    "background",
  );
  const textColor = useThemeColor({}, "text");
  const placeholderColor = useThemeColor(
    { light: "#999", dark: "#666" },
    "text",
  );
  const tintColor = useThemeColor({}, "tint");

  const handleSend = () => {
    if (canSend && !isRunning) {
      composerRuntime.send();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.inputContainer, { backgroundColor }]}>
        <TextInput
          style={[styles.input, { color: textColor }]}
          placeholder="Type a message..."
          placeholderTextColor={placeholderColor}
          value={text}
          onChangeText={(newText) => composerRuntime.setText(newText)}
          multiline
          maxLength={4000}
          editable={!isRunning}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: canSend && !isRunning ? tintColor : "#ccc" },
          ]}
          onPress={handleSend}
          disabled={!canSend || isRunning}
        >
          {isRunning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ccc",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});
