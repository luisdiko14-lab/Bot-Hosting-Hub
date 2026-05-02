import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

interface Props {
  data: number[];
  color?: string;
  height?: number;
  label?: string;
  unit?: string;
  current?: number;
  showGradient?: boolean;
}

function buildPath(points: number[], width: number, height: number): string {
  if (points.length < 2) return "";
  const min = 0;
  const max = 100;
  const range = max - min || 1;
  const xStep = width / (points.length - 1);

  const normalize = (v: number) => height - ((v - min) / range) * (height * 0.85) - height * 0.05;

  let d = `M 0 ${normalize(points[0])}`;
  for (let i = 1; i < points.length; i++) {
    const x0 = (i - 1) * xStep;
    const x1 = i * xStep;
    const y0 = normalize(points[i - 1]);
    const y1 = normalize(points[i]);
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
  }
  return d;
}

function buildAreaPath(linePath: string, width: number, height: number): string {
  if (!linePath) return "";
  return `${linePath} L ${width} ${height} L 0 ${height} Z`;
}

export function SparklineChart({
  data,
  color,
  height = 64,
  label,
  unit = "%",
  current,
  showGradient = true,
}: Props) {
  const colors = useColors();
  const lineColor = color ?? colors.primary;
  const width = 280;

  const padded = data.length < 2 ? [...Array(2 - data.length).fill(0), ...data] : data;
  const linePath = buildPath(padded, width, height);
  const areaPath = buildAreaPath(linePath, width, height);
  const gradId = `grad-${label ?? "chart"}`.replace(/\s/g, "");

  const displayCurrent = current ?? (data.length > 0 ? data[data.length - 1] : 0);
  const colorForValue = displayCurrent > 85 ? colors.destructive : displayCurrent > 60 ? colors.warning : lineColor;

  return (
    <View style={styles.container}>
      {(label || current !== undefined) && (
        <View style={styles.header}>
          {label && <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>}
          <Text style={[styles.value, { color: colorForValue }]}>
            {Math.round(displayCurrent)}{unit}
          </Text>
        </View>
      )}
      <View style={[styles.chart, { height }]}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colorForValue} stopOpacity={0.3} />
              <Stop offset="100%" stopColor={colorForValue} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          {showGradient && areaPath ? (
            <Path d={areaPath} fill={`url(#${gradId})`} />
          ) : null}
          {linePath ? (
            <Path
              d={linePath}
              stroke={colorForValue}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 12, fontFamily: "Inter_400Regular" },
  value: { fontSize: 15, fontFamily: "Inter_700Bold" },
  chart: { borderRadius: 6, overflow: "hidden" },
});
