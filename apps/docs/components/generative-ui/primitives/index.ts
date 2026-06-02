import type { UIRegistry } from "../types";
import { Card } from "./card";
import { Box } from "./box";
import { Col } from "./col";
import { Row } from "./row";
import { Spacer } from "./spacer";
import { Divider } from "./divider";
import { Text } from "./text";
import { Title } from "./title";
import { Caption } from "./caption";
import { Image } from "./image";
import { Icon } from "./icon";
import { Chart } from "./chart";
import { Badge } from "./badge";
import { Button } from "./button";

export { Card } from "./card";
export { Box } from "./box";
export { Col } from "./col";
export { Row } from "./row";
export { Spacer } from "./spacer";
export { Divider } from "./divider";
export { Text } from "./text";
export { Title } from "./title";
export { Caption } from "./caption";
export { Image } from "./image";
export { Icon } from "./icon";
export { Chart } from "./chart";
export { Badge } from "./badge";
export { Button } from "./button";

/**
 * The shipped primitive vocabulary. Spread it with your own components
 * (`{ ...DEFAULT_REGISTRY, MyComponent }`) to render a JSON spec; every node
 * resolves by its `type` against the same registry.
 */
export const DEFAULT_REGISTRY: UIRegistry = {
  Card,
  Box,
  Col,
  Row,
  Spacer,
  Divider,
  Text,
  Title,
  Caption,
  Image,
  Icon,
  Chart,
  Badge,
  Button,
};
