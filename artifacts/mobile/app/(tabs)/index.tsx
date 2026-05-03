import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatCard } from "@/components/StatCard";
import { MetricBar } from "@/components/MetricBar";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useBots } from "@/context/BotsContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useColors } from "@/hooks/useColors";

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { bots, totalBots, onlineBots, totalRamUsedMb, startBot, stopBot } = useBots();
  const { unreadCount } = useNotifications();
  const [refreshing, setRefreshing] = React.useState(false);

  const totalRamMb = bots.reduce((s, b) => s + b.ramMb, 0);
  const totalCpu = bots.reduce((s, b) => s + b.cpuUsagePercent, 0) / Math.max(1, bots.length);
  const totalCommands = bots.reduce((s, b) => s + b.commandCount, 0);
  const totalServers = bots.reduce((s, b) => s + b.serverCount, 0);
  const totalUsers = bots.reduce((s, b) => s + b.userCount, 0);
  const avgResponse = bots.reduce((s, b) => s + b.avgResponseMs, 0) / Math.max(1, bots.length);

  const recentLogs = bots
    .flatMap((b) => b.logs.map((l) => ({ ...l, id: `${b.id}-${l.id}`, botName: b.name })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const logColor: Record<string, string> = {
    info: colors.success,
    warn: colors.warning,
    error: colors.destructive,
    debug: colors.mutedForeground,
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Welcome back</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Dashboard</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.bellBtn, { backgroundColor: colors.card }]}
            onPress={() => router.push("/alerts")}
          >
            <Feather name="bell" size={19} color={unreadCount > 0 ? "#da373c" : colors.mutedForeground} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/create-bot")}
          >
            <Feather name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          label="Total Bots"
          value={String(totalBots)}
          icon="cpu"
          color={colors.primary}
          sub={`${onlineBots} online`}
        />
        <StatCard
          label="Servers"
          value={totalServers.toLocaleString()}
          icon="server"
          color="#23a55a"
          sub={`${totalUsers.toLocaleString()} users`}
        />
      </View>
      <View style={[styles.statsGrid, { marginTop: 0 }]}>
        <StatCard
          label="Commands Run"
          value={totalCommands >= 1000 ? `${(totalCommands / 1000).toFixed(1)}K` : String(totalCommands)}
          icon="terminal"
          color={colors.warning}
        />
        <StatCard
          label="Avg Response"
          value={`${Math.round(avgResponse)}ms`}
          icon="zap"
          color="#00b0f4"
        />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SectionHeader title="Resource Usage" />
        <View style={styles.metrics}>
          <MetricBar
            label="RAM"
            value={totalRamUsedMb}
            max={Math.max(1, totalRamMb)}
            unit="MB"
            showPercent={false}
          />
          <MetricBar label="CPU (avg)" value={Math.round(totalCpu)} showPercent />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SectionHeader title="Bots" action="See all" onAction={() => router.push("/(tabs)/bots")} />
        {bots.slice(0, 4).map((bot) => (
          <TouchableOpacity
            key={bot.id}
            style={[styles.botRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push({ pathname: "/bot/[id]", params: { id: bot.id } })}
          >
            <View style={[styles.botAvatar, { backgroundColor: colors.primary + "33" }]}>
              <Feather name="cpu" size={16} color={colors.primary} />
            </View>
            <View style={styles.botInfo}>
              <Text style={[styles.botName, { color: colors.foreground }]} numberOfLines={1}>
                {bot.name}
              </Text>
              <Text style={[styles.botSub, { color: colors.mutedForeground }]}>
                {bot.status === "online" || bot.status === "idle"
                  ? `Up ${formatUptime(bot.uptimeSeconds)}`
                  : `${bot.ramMb}MB · ${bot.cpuCores} core${bot.cpuCores > 1 ? "s" : ""}`}
              </Text>
            </View>
            <StatusBadge status={bot.status} size="sm" />
            <TouchableOpacity
              onPress={() => (bot.status === "online" || bot.status === "idle" ? stopBot(bot.id) : startBot(bot.id))}
              style={[
                styles.quickAction,
                {
                  backgroundColor:
                    bot.status === "online" || bot.status === "idle"
                      ? colors.destructive + "22"
                      : colors.success + "22",
                },
              ]}
            >
              <Feather
                name={bot.status === "online" || bot.status === "idle" ? "square" : "play"}
                size={14}
                color={bot.status === "online" || bot.status === "idle" ? colors.destructive : colors.success}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SectionHeader title="Recent Activity" />
        {recentLogs.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>No recent activity</Text>
        ) : (
          recentLogs.map((log) => (
            <View key={log.id} style={[styles.logRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.logDot, { backgroundColor: logColor[log.level] ?? colors.mutedForeground }]} />
              <View style={styles.logInfo}>
                <Text style={[styles.logBot, { color: colors.mutedForeground }]}>{log.botName}</Text>
                <Text style={[styles.logMsg, { color: colors.foreground }]} numberOfLines={1}>
                  {log.message}
                </Text>
              </View>
              <Text style={[styles.logTime, { color: colors.mutedForeground }]}>
                {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SectionHeader title="System Status" />
        {[
          { label: "API Gateway", ok: true },
          { label: "Discord CDN", ok: true },
          { label: "Database Cluster", ok: true },
          { label: "File Storage", ok: true },
          { label: "Backup Service", ok: true },
        ].map((item) => (
          <View key={item.label} style={[styles.statusRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.statusLabel, { color: colors.foreground }]}>{item.label}</Text>
            <View style={styles.statusOk}>
              <View style={[styles.statusDot, { backgroundColor: item.ok ? colors.success : colors.destructive }]} />
              <Text style={[styles.statusText, { color: item.ok ? colors.success : colors.destructive }]}>
                {item.ok ? "Operational" : "Degraded"}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { fontSize: 12, fontFamily: "Inter_400Regular" },
  title: { fontSize: 24, fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#da373c",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  bellBadgeText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#fff" },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statsGrid: { flexDirection: "row", gap: 12 },
  card: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 14 },
  metrics: { gap: 12 },
  botRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  botAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  botInfo: { flex: 1 },
  botName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  botSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  quickAction: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  logDot: { width: 7, height: 7, borderRadius: 3.5 },
  logInfo: { flex: 1 },
  logBot: { fontSize: 10, fontFamily: "Inter_400Regular" },
  logMsg: { fontSize: 13, fontFamily: "Inter_400Regular" },
  logTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statusOk: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  empty: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 10 },
});
