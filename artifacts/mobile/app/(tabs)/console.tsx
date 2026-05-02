import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { useBots, type Bot, type LogEntry } from "@/context/BotsContext";
import { useColors } from "@/hooks/useColors";

type LevelFilter = "all" | "info" | "warn" | "error" | "debug";

const LEVEL_COLORS: Record<string, string> = {};

function LogLine({ log, colors }: { log: LogEntry & { botName: string }; colors: ReturnType<typeof useColors> }) {
  const levelColor: Record<string, string> = {
    info: colors.success,
    warn: colors.warning,
    error: colors.destructive,
    debug: colors.mutedForeground,
  };
  return (
    <View style={styles.logLine}>
      <Text style={[styles.logTime, { color: colors.mutedForeground }]}>
        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </Text>
      <View style={[styles.logLevelBadge, { backgroundColor: (levelColor[log.level] ?? colors.mutedForeground) + "22" }]}>
        <Text style={[styles.logLevel, { color: levelColor[log.level] ?? colors.mutedForeground }]}>
          {log.level.toUpperCase()}
        </Text>
      </View>
      <Text style={[styles.logBot, { color: colors.primary }]}>[{log.botName}]</Text>
      <Text style={[styles.logMsg, { color: colors.foreground }]} selectable>
        {log.message}
      </Text>
    </View>
  );
}

export default function ConsoleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bots, clearLogs, addLog } = useBots();
  const flatRef = useRef<FlatList>(null);
  const [selectedBotId, setSelectedBotId] = useState<string | "all">("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const allLogs: (LogEntry & { botName: string })[] = bots
    .flatMap((b) => b.logs.map((l) => ({ ...l, botName: b.name, botId: b.id })))
    .filter((l) => {
      if (selectedBotId !== "all" && (l as any).botId !== selectedBotId) return false;
      if (levelFilter !== "all" && l.level !== levelFilter) return false;
      if (search && !l.message.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-200);

  useEffect(() => {
    if (autoScroll && allLogs.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [allLogs.length, autoScroll]);

  const simulateLog = useCallback(() => {
    const activeBots = bots.filter((b) => b.status === "online" || b.status === "idle");
    if (activeBots.length === 0) return;
    const bot = activeBots[Math.floor(Math.random() * activeBots.length)];
    const msgs = [
      "Command executed successfully",
      "User joined the server",
      "Rate limit hit, retrying in 500ms",
      "Cache refreshed",
      "Heartbeat acknowledged",
    ];
    const levels: LogEntry["level"][] = ["info", "debug", "warn"];
    addLog(bot.id, levels[Math.floor(Math.random() * levels.length)], msgs[Math.floor(Math.random() * msgs.length)]);
  }, [bots, addLog]);

  useEffect(() => {
    const t = setInterval(simulateLog, 4000);
    return () => clearInterval(t);
  }, [simulateLog]);

  const handleClear = () => {
    Alert.alert("Clear Logs", "Clear logs for selected bot(s)?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          if (selectedBotId === "all") {
            bots.forEach((b) => clearLogs(b.id));
          } else {
            clearLogs(selectedBotId);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Console</Text>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => setShowSearch((x) => !x)}>
            <Feather name="search" size={18} color={showSearch ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAutoScroll((x) => !x)}>
            <Feather name="chevrons-down" size={18} color={autoScroll ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear}>
            <Feather name="trash-2" size={18} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Feather name="search" size={14} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Filter logs..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            autoFocus
          />
        </View>
      )}

      <View style={[styles.filters, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <FlatList
          horizontal
          data={[{ id: "all", name: "All" }, ...bots.map((b) => ({ id: b.id, name: b.name }))]}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedBotId(item.id)}
              style={[styles.chip, { backgroundColor: selectedBotId === item.id ? colors.primary : colors.surface, borderColor: selectedBotId === item.id ? colors.primary : colors.border }]}
            >
              <Text style={[styles.chipText, { color: selectedBotId === item.id ? "#fff" : colors.mutedForeground }]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingVertical: 8 }}
        />
      </View>

      <View style={[styles.levelFilters, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["all", "info", "warn", "error", "debug"] as LevelFilter[]).map((lvl) => {
          const levelColor: Record<string, string> = {
            all: colors.foreground,
            info: colors.success,
            warn: colors.warning,
            error: colors.destructive,
            debug: colors.mutedForeground,
          };
          return (
            <TouchableOpacity
              key={lvl}
              onPress={() => setLevelFilter(lvl)}
              style={[styles.lvlChip, levelFilter === lvl && { backgroundColor: levelColor[lvl] + "22" }]}
            >
              <Text style={[styles.lvlText, { color: levelFilter === lvl ? levelColor[lvl] : colors.mutedForeground }]}>
                {lvl.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
        <Text style={[styles.logCount, { color: colors.mutedForeground }]}>{allLogs.length} lines</Text>
      </View>

      <FlatList
        ref={flatRef}
        data={allLogs}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => <LogLine log={item} colors={colors} />}
        contentContainerStyle={{ padding: 8, paddingBottom: insets.bottom + 100, gap: 2 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="terminal" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No logs yet</Text>
          </View>
        }
        style={{ backgroundColor: "#0a0c0f" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  topActions: { flexDirection: "row", gap: 16, alignItems: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  searchInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", padding: 0 },
  filters: { borderBottomWidth: StyleSheet.hairlineWidth },
  levelFilters: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  chipText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  lvlChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  lvlText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  logCount: { marginLeft: "auto", fontSize: 10, fontFamily: "Inter_400Regular" },
  logLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, paddingVertical: 2, paddingHorizontal: 4 },
  logTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  logLevelBadge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  logLevel: { fontSize: 9, fontFamily: "Inter_700Bold" },
  logBot: { fontSize: 11, fontFamily: "Inter_500Medium" },
  logMsg: { fontSize: 12, fontFamily: "Inter_400Regular", flexShrink: 1 },
  empty: { alignItems: "center", gap: 8, paddingTop: 80 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  surface: {},
});
