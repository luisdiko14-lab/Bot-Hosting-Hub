import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge } from "@/components/StatusBadge";
import { MetricBar } from "@/components/MetricBar";
import { useBots, type Bot } from "@/context/BotsContext";
import { useColors } from "@/hooks/useColors";

function formatUptime(seconds: number): string {
  if (seconds === 0) return "Not running";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function formatBytes(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)}GB`;
  return `${mb}MB`;
}

function BotItem({ bot }: { bot: Bot }) {
  const colors = useColors();
  const router = useRouter();
  const { startBot, stopBot, restartBot, removeBot } = useBots();
  const [expanded, setExpanded] = useState(false);

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(bot.name, "What would you like to do?", [
      { text: "Open", onPress: () => router.push({ pathname: "/bot/[id]", params: { id: bot.id } }) },
      {
        text: bot.status === "online" || bot.status === "idle" ? "Stop" : "Start",
        onPress: () =>
          bot.status === "online" || bot.status === "idle" ? stopBot(bot.id) : startBot(bot.id),
      },
      { text: "Restart", onPress: () => restartBot(bot.id) },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete Bot", `Delete "${bot.name}"? This cannot be undone.`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => removeBot(bot.id) },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.botCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push({ pathname: "/bot/[id]", params: { id: bot.id } })}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
          <Feather name="cpu" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.botName, { color: colors.foreground }]} numberOfLines={1}>
            {bot.name}
          </Text>
          <View style={styles.subRow}>
            <StatusBadge status={bot.status} size="sm" />
            <Text style={[styles.subText, { color: colors.mutedForeground }]}>·</Text>
            <Text style={[styles.subText, { color: colors.mutedForeground }]}>
              {formatUptime(bot.uptimeSeconds)}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() =>
              bot.status === "online" || bot.status === "idle" ? stopBot(bot.id) : startBot(bot.id)
            }
            style={[
              styles.actionBtn,
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
          <TouchableOpacity
            onPress={() => restartBot(bot.id)}
            style={[styles.actionBtn, { backgroundColor: colors.warning + "22" }]}
          >
            <Feather name="refresh-cw" size={14} color={colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setExpanded((x) => !x)}>
            <Feather
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.pillRow}>
        {[
          { icon: "database" as const, label: formatBytes(bot.ramMb) + " RAM" },
          { icon: "cpu" as const, label: `${bot.cpuCores} core${bot.cpuCores > 1 ? "s" : ""}` },
          { icon: "code" as const, label: bot.runtime.replace("nodejs", "Node ").replace("python", "Py ") },
          { icon: "server" as const, label: `${bot.serverCount} servers` },
        ].map((p) => (
          <View key={p.label} style={[styles.pill, { backgroundColor: colors.surface }]}>
            <Feather name={p.icon} size={11} color={colors.mutedForeground} />
            <Text style={[styles.pillText, { color: colors.mutedForeground }]}>{p.label}</Text>
          </View>
        ))}
      </View>

      {expanded && (
        <View style={styles.expanded}>
          <MetricBar
            label="RAM"
            value={bot.ramUsagePercent}
            showPercent
          />
          <MetricBar label="CPU" value={bot.cpuUsagePercent} showPercent />
          <View style={styles.expandedStats}>
            {[
              { label: "Commands", value: bot.commandCount.toLocaleString() },
              { label: "Users", value: bot.userCount.toLocaleString() },
              { label: "Avg resp", value: `${bot.avgResponseMs}ms` },
              { label: "Error rate", value: `${bot.errorRate}%` },
            ].map((s) => (
              <View key={s.label} style={styles.eStat}>
                <Text style={[styles.eStatVal, { color: colors.foreground }]}>{s.value}</Text>
                <Text style={[styles.eStatLbl, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function BotsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { bots } = useBots();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");

  const filtered = bots.filter((b) => {
    const matchSearch = b.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "online" && (b.status === "online" || b.status === "idle")) ||
      (filter === "offline" && b.status === "offline");
    return matchSearch && matchFilter;
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>My Bots</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/create-bot")}
        >
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16 }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search bots..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.filterRow, { paddingHorizontal: 16 }]}>
        {(["all", "online", "offline"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === f ? colors.primary : colors.card,
                borderColor: filter === f ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f ? "#fff" : colors.mutedForeground },
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={[styles.countText, { color: colors.mutedForeground }]}>
          {filtered.length} bot{filtered.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => <BotItem bot={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 12 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="cpu" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No bots found</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {search ? "Try a different search" : "Add your first Discord bot to get started"}
            </Text>
            {!search && (
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/create-bot")}
              >
                <Text style={styles.emptyBtnText}>Add Bot</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12 },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, gap: 8, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  filterRow: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 4 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  countText: { marginLeft: "auto", fontSize: 12, fontFamily: "Inter_400Regular" },
  botCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1 },
  botName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  subRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  subText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 6, alignItems: "center" },
  actionBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pillText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  expanded: { gap: 10, paddingTop: 4 },
  expandedStats: { flexDirection: "row", justifyContent: "space-between" },
  eStat: { alignItems: "center" },
  eStatVal: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  eStatLbl: { fontSize: 10, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", gap: 10, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  surface: { backgroundColor: "transparent" },
});
