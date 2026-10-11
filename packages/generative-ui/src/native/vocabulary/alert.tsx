import {
  Children,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import type { GenerativeUILibrary } from "../../types";
import { alertDefinitions } from "../../vocabulary/definitions/alert";
import { MAX_CARDS } from "../../vocabulary/carouselValues";
import { toTextContent } from "../../vocabulary/toTextContent";
import {
  CardSurfaceProvider,
  fade,
  RADIUS,
  useInk,
  useNativeTheme,
} from "../theme";

const styles = StyleSheet.create({
  alert: {
    borderWidth: 1,
    borderRadius: RADIUS.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  title: { fontSize: 14, fontWeight: "500", marginBottom: 4 },
  description: { fontSize: 13 },
  track: { flexGrow: 0 },
  slides: { gap: 12, paddingBottom: 8 },
  slide: { minWidth: 224, flexShrink: 0 },
  controls: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  control: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: { fontSize: 20, lineHeight: 24 },
});

function Alert({
  title,
  description,
  tone = "info",
  children,
}: {
  title?: string;
  description?: string;
  tone?: "info" | "success" | "warning" | "danger";
  children?: ReactNode;
}) {
  const theme = useNativeTheme();
  const ink = useInk();
  const color =
    tone === "success"
      ? theme.success
      : tone === "warning"
        ? theme.warning
        : tone === "danger"
          ? theme.destructive
          : theme.primary;
  const alertTitle = toTextContent(title);
  const alertDescription = toTextContent(description);
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.alert,
        { borderColor: fade(color, 0.45), backgroundColor: fade(color, 0.08) },
      ]}
    >
      {alertTitle ? (
        <Text style={[styles.title, { color: ink }]}>{alertTitle}</Text>
      ) : null}
      {alertDescription ? (
        <Text style={[styles.description, { color: fade(ink, 0.62) }]}>
          {alertDescription}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

type SlideLayout = { x: number; width: number };

function Carousel({
  label,
  children,
}: {
  label?: string;
  children?: ReactNode;
}) {
  const ink = useInk();
  const track = useRef<ComponentRef<typeof ScrollView>>(null);
  const [viewport, setViewport] = useState(0);
  const [layouts, setLayouts] = useState<(SlideLayout | undefined)[]>([]);
  const [offset, setOffset] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  const cards = Children.toArray(children).slice(0, MAX_CARDS);
  const starts = layouts
    .slice(0, cards.length)
    .flatMap((slide) => (slide ? [slide.x] : []));
  const last = layouts[cards.length - 1];
  const maxOffset = Math.max(0, (last?.x ?? 0) + (last?.width ?? 0) - viewport);
  const overflows =
    viewport > 0 &&
    layouts.slice(0, cards.length).every(Boolean) &&
    maxOffset > 0;
  const atStart = offset <= 1;
  const atEnd = offset >= maxOffset - 1;

  useEffect(() => {
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        changed = true;
        setReduceMotion(enabled);
      },
    );
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active && !changed) setReduceMotion(enabled);
    });
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  const measureSlide = (index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setLayouts((current) => {
      if (current[index]?.x === x && current[index]?.width === width)
        return current;
      const next = [...current];
      next[index] = { x, width };
      return next;
    });
  };

  const move = (direction: -1 | 1) => {
    let current = 0;
    starts.forEach((start, index) => {
      if (
        Math.abs(start - offset) < Math.abs((starts[current] ?? start) - offset)
      )
        current = index;
    });
    const target = starts[current + direction];
    if (target !== undefined)
      track.current?.scrollTo({ x: target, y: 0, animated: !reduceMotion });
  };

  return (
    <View>
      <ScrollView
        ref={track}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        accessibilityRole={label ? "region" : "group"}
        accessibilityLabel={label}
        style={styles.track}
        contentContainerStyle={styles.slides}
        snapToOffsets={starts}
        onLayout={(event) => setViewport(event.nativeEvent.layout.width)}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) =>
          setOffset(event.nativeEvent.contentOffset.x)
        }
      >
        {cards.map((card, index) => (
          <View
            key={index}
            accessibilityRole="group"
            accessibilityLabel={`${index + 1} of ${cards.length}`}
            style={styles.slide}
            onLayout={(event) => measureSlide(index, event)}
          >
            <CardSurfaceProvider value={true}>{card}</CardSurfaceProvider>
          </View>
        ))}
      </ScrollView>
      {overflows ? (
        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous slide"
            accessibilityState={{ disabled: atStart }}
            disabled={atStart}
            onPress={() => move(-1)}
            style={[styles.control, atStart && { opacity: 0.5 }]}
          >
            <Text style={[styles.arrow, { color: ink }]}>‹</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next slide"
            accessibilityState={{ disabled: atEnd }}
            disabled={atEnd}
            onPress={() => move(1)}
            style={[styles.control, atEnd && { opacity: 0.5 }]}
          >
            <Text style={[styles.arrow, { color: ink }]}>›</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export const alertVocabulary = {
  Alert: {
    ...alertDefinitions.Alert,
    render: (props) => <Alert {...props} />,
  },
  Carousel: {
    ...alertDefinitions.Carousel,
    render: (props) => <Carousel {...props} />,
  },
} satisfies GenerativeUILibrary;
