import { Colors, type Palette } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function useTheme(): { isDark: boolean; colors: Palette } {
  const isDark = useColorScheme() === "dark";
  return { isDark, colors: isDark ? Colors.dark : Colors.light };
}
