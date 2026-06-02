import { WeatherWidget } from "@/components/generative-ui/weather-widget/runtime";
import { DEFAULT_REGISTRY, type UIRegistry } from "@/components/generative-ui";

/**
 * The primitive vocabulary plus the gallery's own rich components, registered
 * by type. This is the `{ ...DEFAULT_REGISTRY, MyComponent }` extension pattern:
 * a node's `type` resolves to a primitive or to a bespoke component like
 * WeatherWidget, all through the same schema.
 */
export const GALLERY_REGISTRY: UIRegistry = {
  ...DEFAULT_REGISTRY,
  WeatherWidget,
};
