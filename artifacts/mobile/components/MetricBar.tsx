import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  showPercent?: boolean;
}

export function MetricBar({ label, value, max = 100, unit = "", showPercent = false }: Props) {
  const colors = useColors();
  const percent = Math.min(100, (value / max) * 100);
  const barColor =
    percent > 85 ? colors.destructive : percent > 60 ? colors.warning : colors.success;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.foreground }]}>
          {showPercent ? `${Math.round(percent)}%` : `${value}${unit}`}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 12, fontFamily: "Inter_400Regular" },
  value: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
});
