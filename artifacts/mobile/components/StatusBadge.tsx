import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { BotStatus } from "@/context/BotsContext";

interface Props {
  status: BotStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: Props) {
  const colors = useColors();

  const config: Record<BotStatus, { color: string; label: string }> = {
    online: { color: colors.success, label: "Online" },
    offline: { color: colors.mutedForeground, label: "Offline" },
    idle: { color: colors.warning, label: "Idle" },
    error: { color: colors.destructive, label: "Error" },
    starting: { color: "#00b0f4", label: "Starting" },
  };

  const { color, label } = config[status];
  const isSmall = size === "sm";

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }, isSmall && styles.dotSm]} />
      <Text style={[styles.label, { color }, isSmall && styles.labelSm]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotSm: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  labelSm: { fontSize: 11 },
});
