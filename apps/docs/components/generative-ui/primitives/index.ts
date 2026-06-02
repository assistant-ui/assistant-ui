import type { UIRegistry } from "../types";
import { Card } from "./card";
import { Box } from "./box";
import { Col } from "./col";
import { Row } from "./row";
import { Spacer } from "./spacer";
import { Divider } from "./divider";
import { Table, TableRow, TableCell } from "./table";
import { Text } from "./text";
import { Title } from "./title";
import { Caption } from "./caption";
import { Markdown } from "./markdown";
import { Image } from "./image";
import { Icon } from "./icon";
import { Chart } from "./chart";
import { Badge } from "./badge";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Select } from "./select";
import { Checkbox } from "./checkbox";
import { RadioGroup } from "./radio-group";
import { DatePicker } from "./date-picker";
import { Label } from "./label";
import { Form } from "./form";

export { Card } from "./card";
export { Box } from "./box";
export { Col } from "./col";
export { Row } from "./row";
export { Spacer } from "./spacer";
export { Divider } from "./divider";
export { Table, TableRow, TableCell } from "./table";
export { Text } from "./text";
export { Title } from "./title";
export { Caption } from "./caption";
export { Markdown } from "./markdown";
export { Image } from "./image";
export { Icon } from "./icon";
export { Chart } from "./chart";
export { Badge } from "./badge";
export { Button } from "./button";
export { Input } from "./input";
export { Textarea } from "./textarea";
export { Select } from "./select";
export { Checkbox } from "./checkbox";
export { RadioGroup } from "./radio-group";
export { DatePicker } from "./date-picker";
export { Label } from "./label";
export { Form } from "./form";

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
  Table,
  TableRow,
  TableCell,
  Text,
  Title,
  Caption,
  Markdown,
  Image,
  Icon,
  Chart,
  Badge,
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  RadioGroup,
  DatePicker,
  Label,
  Form,
};
