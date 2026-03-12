import {
  View,
  Pressable,
  Image,
  Platform,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  useAui,
  useAuiState,
  ComposerPrimitive,
  AttachmentPrimitive,
} from "@assistant-ui/react-native";

function AttachmentPreview() {
  const attachment = useAuiState((s) => s.attachment);
  if (!attachment) return null;

  // Find image content for preview URI
  const imageContent = attachment.content?.find((c: any) => c.type === "image");
  const uri = (imageContent as any)?.image;

  return (
    <AttachmentPrimitive.Root style={styles.attachmentItem}>
      {uri ? <Image source={{ uri }} style={styles.attachmentImage} /> : null}
      <AttachmentPrimitive.Remove style={styles.attachmentRemoveButton}>
        <Ionicons name="close-circle" size={20} color="#ff453a" />
      </AttachmentPrimitive.Remove>
    </AttachmentPrimitive.Root>
  );
}

const attachmentComponents = { Attachment: AttachmentPreview };

export function Composer() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const aui = useAui();
  const attachmentsCount = useAuiState((s) => s.composer.attachments.length);
  const canCancel = useAuiState((s) => s.composer.canCancel);
  const canSend = useAuiState(
    (s) => !s.thread.isRunning && s.composer.isEditing && !s.composer.isEmpty,
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) return;

    for (const asset of result.assets) {
      // Force JPEG mime type — iOS may report HEIC which OpenAI doesn't support
      const dataUrl = `data:image/jpeg;base64,${asset.base64}`;

      await aui.composer().addAttachment({
        name: asset.fileName ?? "image.jpg",
        contentType: "image/jpeg",
        type: "image",
        content: [{ type: "image", image: dataUrl }],
      });
    }
  };

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
      {attachmentsCount > 0 && (
        <View style={styles.attachmentsList}>
          <ComposerPrimitive.Attachments components={attachmentComponents} />
        </View>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: isDark ? "#1c1c1e" : "#ffffff",
            borderColor: isDark ? "#3a3a3c" : "#e5e5ea",
          },
        ]}
      >
        <Pressable
          style={styles.attachButton}
          onPress={pickImage}
          disabled={canCancel}
        >
          <Ionicons
            name="add-circle-outline"
            size={24}
            color={isDark ? "#8e8e93" : "#6e6e73"}
          />
        </Pressable>
        <ComposerPrimitive.Input
          style={[styles.input, { color: isDark ? "#ffffff" : "#000000" }]}
          placeholder="Message..."
          placeholderTextColor="#8e8e93"
          multiline
          maxLength={4000}
          editable={!canCancel}
        />
        {canCancel ? (
          <ComposerPrimitive.Cancel style={[styles.button, styles.stopButton]}>
            <View style={styles.stopIcon} />
          </ComposerPrimitive.Cancel>
        ) : (
          <ComposerPrimitive.Send
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
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={canSend ? "#ffffff" : "#8e8e93"}
            />
          </ComposerPrimitive.Send>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  attachmentsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 8,
  },
  attachmentItem: {
    position: "relative",
  },
  attachmentImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  attachmentRemoveButton: {
    position: "absolute",
    top: -6,
    right: -6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 20,
    borderWidth: 1,
    padding: 6,
  },
  attachButton: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    alignSelf: "center",
    paddingVertical: 0,
    ...Platform.select({
      web: { paddingHorizontal: 4, outlineStyle: "none" },
      default: {},
    }),
  },
  button: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
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
