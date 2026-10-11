import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Color, TextSize, Weight } from "../../ir";
import type { GenerativeUILibrary } from "../../types";
import { textDefinitions } from "../../vocabulary/definitions/text";
import { toTextContent } from "../../vocabulary/toTextContent";
import {
  fade,
  FONT_WEIGHT,
  TEXT_SIZE,
  textColor,
  useInk,
  useNativeTheme,
} from "../theme";

const styles = StyleSheet.create({
  withChildren: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
  },
  header: { fontWeight: "600", letterSpacing: -0.18 },
  caption: { fontSize: 12, lineHeight: 17 },
});

/** Text with spec children: the children sit beside the text in a wrapping row, because a React Native View nested inside Text is only partly supported. */
const withChildren = (text: ReactNode, children: ReactNode) =>
  children == null || children === false ? (
    text
  ) : (
    <View style={styles.withChildren}>
      {text}
      {children}
    </View>
  );

/** The larger sizes tighten their letter spacing and turn semibold, as on the web. */
const display = (size: TextSize) =>
  size === "2xl" || size === "3xl"
    ? { fontWeight: "600" as const, letterSpacing: TEXT_SIZE[size] * -0.02 }
    : undefined;

function Header({
  text,
  size = "lg",
  children,
}: {
  text?: string;
  size?: TextSize;
  children?: ReactNode;
}) {
  const ink = useInk();
  return withChildren(
    <Text
      accessibilityRole="header"
      style={[
        styles.header,
        {
          fontSize: TEXT_SIZE[size],
          lineHeight: Math.round(TEXT_SIZE[size] * 1.2),
          color: ink,
        },
        display(size),
      ]}
    >
      {toTextContent(text)}
    </Text>,
    children,
  );
}

function Body({
  value,
  size = "md",
  weight,
  color,
  children,
}: {
  value?: string;
  size?: TextSize;
  weight?: Weight;
  color?: Color;
  children?: ReactNode;
}) {
  const theme = useNativeTheme();
  const ink = useInk();
  return withChildren(
    <Text
      style={[
        { fontSize: TEXT_SIZE[size], color: textColor(color, ink, theme) },
        display(size),
        weight !== undefined && { fontWeight: FONT_WEIGHT[weight] },
      ]}
    >
      {toTextContent(value)}
    </Text>,
    children,
  );
}

function Caption({
  value,
  children,
}: {
  value?: string;
  children?: ReactNode;
}) {
  const ink = useInk();
  return withChildren(
    <Text style={[styles.caption, { color: fade(ink, 0.62) }]}>
      {toTextContent(value)}
    </Text>,
    children,
  );
}

export const textVocabulary = {
  Header: {
    ...textDefinitions.Header,
    render: (props) => <Header {...props} />,
  },
  Text: {
    ...textDefinitions.Text,
    render: (props) => <Body {...props} />,
  },
  Caption: {
    ...textDefinitions.Caption,
    render: (props) => <Caption {...props} />,
  },
} satisfies GenerativeUILibrary;
