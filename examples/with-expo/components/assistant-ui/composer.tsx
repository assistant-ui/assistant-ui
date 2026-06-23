import { View, Pressable, Platform, StyleSheet } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  useAui,
  useAuiState,
  AuiIf,
  ComposerPrimitive,
  AttachmentPrimitive,
} from "@assistant-ui/react-native";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { Radius, Spacing } from "@/constants/theme";
import { haptics } from "@/lib/haptics";

function AttachmentPreview() {
  const { colors } = useTheme();
  const attachment = useAuiState((s) => s.attachment);
  if (!attachment) return null;

  const imageContent = attachment.content?.find((c: any) => c.type === "image");
  const uri = (imageContent as any)?.image;

  return (
    <AttachmentPrimitive.Root style={styles.attachmentItem}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.attachmentImage, { backgroundColor: colors.muted }]}
          contentFit="cover"
          transition={120}
        />
      ) : null}
      <AttachmentPrimitive.Remove
        onPressIn={haptics.light}
        style={styles.attachmentRemove}
      >
        <View
          style={[styles.removeBadge, { backgroundColor: colors.foreground }]}
        >
          <Icon name="remove" size={16} color={colors.background} />
        </View>
      </AttachmentPrimitive.Remove>
    </AttachmentPrimitive.Root>
  );
}

function SendButton() {
  const { colors } = useTheme();
  const canSend = useAuiState((s) => s.composer.canSend);

  return (
    <ComposerPrimitive.Send
      accessibilityLabel="Send message"
      onPressIn={() => canSend && haptics.success()}
      style={[
        styles.actionButton,
        { backgroundColor: canSend ? colors.primary : colors.muted },
      ]}
    >
      <Icon
        name="send"
        size={18}
        color={canSend ? colors.primaryForeground : colors.mutedForeground}
      />
    </ComposerPrimitive.Send>
  );
}

function CancelButton() {
  const { colors } = useTheme();
  return (
    <ComposerPrimitive.Cancel
      accessibilityLabel="Stop generating"
      onPressIn={haptics.light}
      style={[styles.actionButton, { backgroundColor: colors.foreground }]}
    >
      <Icon name="stop" size={15} color={colors.background} />
    </ComposerPrimitive.Cancel>
  );
}

function AttachButton() {
  const { colors } = useTheme();
  const aui = useAui();

  const pickImage = async () => {
    haptics.selection();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled) return;

    for (const asset of result.assets) {
      // iOS may report HEIC, which OpenAI rejects; normalize to JPEG.
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
    <Pressable
      accessibilityLabel="Add image"
      onPress={pickImage}
      hitSlop={6}
      style={({ pressed }) => [
        styles.attachButton,
        { backgroundColor: pressed ? colors.muted : "transparent" },
      ]}
    >
      <Icon name="add" size={20} color={colors.mutedForeground} />
    </Pressable>
  );
}

export function Composer() {
  const { colors } = useTheme();
  const hasAttachments = useAuiState((s) => s.composer.attachments.length > 0);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.shell,
          { backgroundColor: colors.composer, borderColor: colors.border },
        ]}
      >
        {hasAttachments && (
          <View style={styles.attachmentsRow}>
            <ComposerPrimitive.Attachments>
              {() => <AttachmentPreview />}
            </ComposerPrimitive.Attachments>
          </View>
        )}

        <ComposerPrimitive.Input
          style={[styles.input, { color: colors.foreground }]}
          placeholder="Message…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={4000}
        />

        <View style={styles.actionRow}>
          <AttachButton />
          <AuiIf condition={(s) => !s.thread.isRunning}>
            <SendButton />
          </AuiIf>
          <AuiIf condition={(s) => s.thread.isRunning}>
            <CancelButton />
          </AuiIf>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: Spacing.threadMaxWidth + 24,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  shell: {
    flexDirection: "column",
    gap: 6,
    borderRadius: Radius.composer,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
  },
  attachmentsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  attachmentItem: {
    position: "relative",
  },
  attachmentImage: {
    width: 56,
    height: 56,
    borderRadius: Radius.attachment,
  },
  attachmentRemove: {
    position: "absolute",
    top: -6,
    right: -6,
  },
  removeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    minHeight: 28,
    maxHeight: 132,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 2,
    ...Platform.select({
      web: { outlineStyle: "none" } as any,
      default: {},
    }),
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  attachButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
