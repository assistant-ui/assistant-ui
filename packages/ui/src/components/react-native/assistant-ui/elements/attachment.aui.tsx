import { Icon } from "@/components/ui/icon";
import {
  AttachmentPrimitive,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react-native";
import * as ImagePicker from "expo-image-picker";
import { PlusIcon, XIcon } from "lucide-react-native";
import type { FC } from "react";
import { Image, Pressable, View } from "react-native";

const useAttachmentImageUri = () =>
  useAuiState((s) => {
    const part = s.attachment.content?.find((c) => c.type === "image");
    return part?.type === "image" ? part.image : undefined;
  });

const AttachmentName: FC = () => (
  <View className="aui-attachment-file bg-muted border-border h-14 max-w-40 justify-center rounded-xl border px-3">
    <AttachmentPrimitive.Name
      className="aui-attachment-name text-foreground text-xs"
      numberOfLines={1}
    />
  </View>
);

const ComposerAttachment: FC = () => {
  const uri = useAttachmentImageUri();

  return (
    <AttachmentPrimitive.Root className="aui-composer-attachment-root relative">
      {uri ? (
        <Image
          source={{ uri }}
          className="aui-composer-attachment-image bg-muted size-14 rounded-xl"
          resizeMode="cover"
        />
      ) : (
        <AttachmentName />
      )}
      <AttachmentPrimitive.Remove
        className="aui-composer-attachment-remove bg-foreground absolute -top-1.5 -right-1.5 size-5 items-center justify-center rounded-full"
        accessibilityLabel="Remove attachment"
      >
        <Icon as={XIcon} className="text-background size-3" />
      </AttachmentPrimitive.Remove>
    </AttachmentPrimitive.Root>
  );
};

export const ComposerAttachments: FC = () => (
  <AuiIf condition={(s) => s.composer.attachments.length > 0}>
    <View className="aui-composer-attachments flex-row flex-wrap gap-2 px-1 pt-1">
      <ComposerPrimitive.Attachments>
        {() => <ComposerAttachment />}
      </ComposerPrimitive.Attachments>
    </View>
  </AuiIf>
);

export const ComposerAddAttachment: FC = () => {
  const aui = useAui();

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled) return;

    for (const asset of result.assets) {
      // iOS may report HEIC, which OpenAI rejects; the picker re-encodes to JPEG when quality is below 1.
      await aui.composer.addAttachment({
        name: asset.fileName ?? "image.jpg",
        contentType: "image/jpeg",
        type: "image",
        content: [
          { type: "image", image: `data:image/jpeg;base64,${asset.base64}` },
        ],
      });
    }
  };

  return (
    <Pressable
      onPress={pickImages}
      className="aui-composer-add-attachment active:bg-muted size-7 items-center justify-center rounded-full"
      accessibilityRole="button"
      accessibilityLabel="Add image"
    >
      <Icon as={PlusIcon} className="text-muted-foreground size-4" />
    </Pressable>
  );
};

const UserMessageAttachment: FC = () => {
  const uri = useAttachmentImageUri();
  if (!uri) return <AttachmentName />;

  return (
    <Image
      source={{ uri }}
      className="aui-user-message-attachment-image bg-muted size-[200px] rounded-2xl"
      resizeMode="cover"
    />
  );
};

export const UserMessageAttachments: FC = () => (
  <AuiIf condition={(s) => (s.message.attachments?.length ?? 0) > 0}>
    <View className="aui-user-message-attachments flex-row flex-wrap justify-end gap-1.5">
      <MessagePrimitive.Attachments>
        {() => <UserMessageAttachment />}
      </MessagePrimitive.Attachments>
    </View>
  </AuiIf>
);
