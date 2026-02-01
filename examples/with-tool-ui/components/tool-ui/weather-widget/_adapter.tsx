/**
 * Adapter: UI and utility re-exports for copy-standalone portability.
 *
 * When copying this component to another project, update these imports
 * to match your project's paths:
 *
 *   cn   → Your Tailwind merge utility (e.g., "@/lib/utils", "~/lib/cn")
 *   Card → shadcn/ui Card
 */

export { cn } from "../../../lib/ui/cn";
export {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../ui/card";
