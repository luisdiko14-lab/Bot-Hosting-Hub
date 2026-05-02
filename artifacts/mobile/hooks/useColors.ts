import colors from "@/constants/colors";
import { useSettings } from "@/context/SettingsContext";

/**
 * Returns design tokens for the current theme (reads from SettingsContext
 * so manual theme switching in Settings immediately applies).
 */
export function useColors() {
  const { isDark } = useSettings();
  const palette = isDark
    ? (colors as Record<string, typeof colors.light>).dark
    : colors.light;
  return { ...palette, radius: colors.radius };
}
