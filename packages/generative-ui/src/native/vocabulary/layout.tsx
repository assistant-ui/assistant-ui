import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Align, Justify } from "../../ir";
import type { GenerativeUILibrary } from "../../types";
import { layoutDefinitions } from "../../vocabulary/definitions/layout";
import { fire } from "../../vocabulary/dispatch";
import { footerAction } from "../../vocabulary/layoutValues";
import { toTextContent } from "../../vocabulary/toTextContent";
import { FieldScopeProvider, useFieldScopeOwner } from "../fieldScope";
import {
  dimension,
  fade,
  InkProvider,
  nativeColor,
  useCardSurface,
  RADIUS,
  space,
  useInk,
  useNativeTheme,
} from "../theme";
import { ActionButton } from "./button";

type FlexAlign = "flex-start" | "center" | "flex-end";

const ALIGN: Record<Align, FlexAlign> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
};

const JUSTIFY = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
} as const satisfies Record<Justify, string>;

const styles = StyleSheet.create({
  card: { flexDirection: "column", gap: 14 },
  surface: { borderWidth: 1, borderRadius: RADIUS.surface, padding: 20 },
  title: { fontSize: 15, fontWeight: "600" },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  badgeSlot: { flexDirection: "row", alignItems: "flex-start" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: RADIUS.pill,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  badgeText: { fontSize: 12, fontWeight: "500", lineHeight: 17 },
  spacer: { flexGrow: 1 },
});

type CardProps = {
  title?: string;
  padding?: number;
  background?: string;
  asForm?: boolean;
  confirm?: { label: string } & Record<string, unknown>;
  cancel?: { label: string } & Record<string, unknown>;
  $action?: Parameters<typeof fire>[0];
  $dispatch?: Parameters<typeof fire>[1];
  children?: ReactNode;
};

function Card({
  title,
  padding,
  background,
  asForm,
  confirm,
  cancel,
  $action,
  $dispatch,
  children,
}: CardProps) {
  const theme = useNativeTheme();
  const ink = useInk();
  const tint = nativeColor(background);
  const submitAction = footerAction(confirm) ?? $action;
  const scope = useFieldScopeOwner((values) =>
    fire(submitAction, $dispatch, values),
  );
  const slide = useCardSurface();
  const surface =
    slide ||
    tint !== undefined ||
    confirm !== undefined ||
    cancel !== undefined;
  const cardInk = tint !== undefined ? "#ffffff" : ink;
  const cardTitle = toTextContent(title);
  const content = (
    <View
      style={[
        styles.card,
        surface && [
          styles.surface,
          { backgroundColor: tint ?? theme.card, borderColor: theme.hairline },
        ],
        padding !== undefined && { padding: space(padding, 0) },
      ]}
    >
      {cardTitle ? (
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: cardInk }]}
        >
          {cardTitle}
        </Text>
      ) : null}
      {children}
      {confirm || cancel ? (
        <View style={[styles.footer, { borderTopColor: theme.hairline }]}>
          {confirm ? (
            <ActionButton
              label={String(toTextContent(confirm.label) ?? "")}
              tone="primary"
              onPress={() =>
                asForm ? scope.submit() : fire(footerAction(confirm), $dispatch)
              }
            />
          ) : null}
          {cancel ? (
            <ActionButton
              label={String(toTextContent(cancel.label) ?? "")}
              tone="ghost"
              onPress={() => fire(footerAction(cancel), $dispatch)}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
  const inked =
    tint !== undefined ? (
      <InkProvider value={cardInk}>{content}</InkProvider>
    ) : (
      content
    );
  return asForm ? (
    <FieldScopeProvider value={scope}>{inked}</FieldScopeProvider>
  ) : (
    inked
  );
}

function Stack({
  direction,
  gap,
  align,
  justify,
  children,
}: {
  direction: "row" | "column";
  gap: number;
  align?: Align;
  justify?: Justify;
  children?: ReactNode;
}) {
  const alignItems = align ? ALIGN[align] : undefined;
  return (
    <View
      style={{
        flexDirection: direction,
        gap,
        ...(alignItems ? { alignItems } : {}),
        ...(justify ? { justifyContent: JUSTIFY[justify] } : {}),
      }}
    >
      {children}
    </View>
  );
}

/** The pill sits in a row of its own, so the parent's alignment places it and a stretching parent leaves it at its own size. */
function Badge({
  value,
  variant,
  children,
}: {
  value?: string;
  variant?: string;
  children?: ReactNode;
}) {
  const theme = useNativeTheme();
  const ink = useInk();
  const tone =
    variant === "info"
      ? theme.primary
      : variant === "success"
        ? theme.success
        : variant === "warning"
          ? theme.warning
          : variant === "danger"
            ? theme.destructive
            : undefined;
  return (
    <View style={styles.badgeSlot}>
      <View
        style={[
          styles.badge,
          { backgroundColor: tone ? fade(tone, 0.15) : theme.secondary },
        ]}
      >
        <Text style={[styles.badgeText, { color: tone ?? fade(ink, 0.62) }]}>
          {toTextContent(value)}
        </Text>
        {children}
      </View>
    </View>
  );
}

function Box({
  width,
  height,
  radius,
  background,
  children,
}: {
  width?: string | number;
  height?: string | number;
  radius?: "full" | number;
  background?: string;
  children?: ReactNode;
}) {
  const color = nativeColor(background);
  const boxWidth = dimension(width);
  const boxHeight = dimension(height);
  return (
    <View
      style={{
        ...(boxWidth !== undefined ? { width: boxWidth } : {}),
        ...(boxHeight !== undefined ? { height: boxHeight } : {}),
        ...(radius === "full"
          ? { borderRadius: RADIUS.pill }
          : typeof radius === "number"
            ? { borderRadius: radius }
            : {}),
        ...(color !== undefined ? { backgroundColor: color } : {}),
        ...(radius !== undefined ? { overflow: "hidden" } : {}),
      }}
    >
      {children}
    </View>
  );
}

export const layoutVocabulary = {
  Card: {
    ...layoutDefinitions.Card,
    render: (props) => <Card {...props} />,
  },
  Col: {
    ...layoutDefinitions.Col,
    render: ({ gap, align, children }) => (
      <Stack direction="column" gap={space(gap, 10)} align={align}>
        {children}
      </Stack>
    ),
  },
  Row: {
    ...layoutDefinitions.Row,
    render: ({ gap, align, justify, children }) => (
      <Stack
        direction="row"
        gap={space(gap, 8)}
        align={align}
        justify={justify}
      >
        {children}
      </Stack>
    ),
  },
  Spacer: {
    ...layoutDefinitions.Spacer,
    render: () => <View style={styles.spacer} />,
  },
  Badge: {
    ...layoutDefinitions.Badge,
    render: ({ value, variant, children }) => (
      <Badge value={value} variant={variant}>
        {children}
      </Badge>
    ),
  },
  Box: {
    ...layoutDefinitions.Box,
    render: ({ width, height, radius, background, children }) => (
      <Box
        width={width}
        height={height}
        radius={radius}
        background={background}
      >
        {children}
      </Box>
    ),
  },
} satisfies GenerativeUILibrary;
