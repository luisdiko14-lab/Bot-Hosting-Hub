import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBots, type LogEntry } from "@/context/BotsContext";
import { useColors } from "@/hooks/useColors";

type LevelFilter = "all" | "info" | "warn" | "error" | "debug";

const LEVEL_COLOR_KEYS: Record<string, string> = {
  info: "success",
  warn: "warning",
  error: "destructive",
  debug: "mutedForeground",
};

const LEVEL_PREFIXES: Record<string, string> = {
  info: "[ INFO ]",
  warn: "[ WARN ]",
  error: "[ERROR ]",
  debug: "[DEBUG ]",
};

const SIM_MESSAGES: Record<string, Array<{ level: LogEntry["level"]; msg: string }>> = {
  nodejs: [
    { level: "info", msg: "Heartbeat acknowledged (seq: {n})" },
    { level: "debug", msg: "Cache hit for key: guild:{gid}" },
    { level: "info", msg: "Shard 0/1 resumed" },
    { level: "info", msg: "Message received in #general" },
    { level: "debug", msg: "REST: GET /channels/{gid}/messages → 200 ({ms}ms)" },
    { level: "info", msg: "Command '!play' executed by user#{uid}" },
    { level: "warn", msg: "Rate limit hit on /channels/{gid} — retry in 1204ms" },
    { level: "debug", msg: "GC pause: 3ms (minor)" },
    { level: "info", msg: "Presence updated: {n} members online" },
    { level: "error", msg: "Failed to fetch member list: 403 Missing Permissions" },
    { level: "debug", msg: "Voice connection heartbeat ACK" },
    { level: "info", msg: "Queue processed: {n} tracks remaining" },
    { level: "warn", msg: "API response time elevated ({ms}ms avg)" },
    { level: "info", msg: "Slash command '/help' registered in {n}ms" },
  ],
  python: [
    { level: "info", msg: "on_ready fired — {n} guilds" },
    { level: "debug", msg: "asyncpg pool: {n}/10 connections in use" },
    { level: "info", msg: "cog 'Economy' dispatched event: on_message" },
    { level: "warn", msg: "Slow query detected ({ms}ms): SELECT * FROM users WHERE…" },
    { level: "info", msg: "Background task 'daily_reward' completed" },
    { level: "debug", msg: "Redis cache: SET user:{uid} EX 3600" },
    { level: "error", msg: "Unhandled exception in cog 'Moderation': IndexError" },
    { level: "info", msg: "Leaderboard updated for guild {gid}" },
    { level: "debug", msg: "Heartbeat interval: 41250ms" },
    { level: "warn", msg: "Memory usage at {n}% — consider gc.collect()" },
  ],
};

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fillTemplate(tpl: string) {
  return tpl
    .replace("{n}", String(rnd(1, 999)))
    .replace("{gid}", String(rnd(100000000, 999999999)))
    .replace("{uid}", String(rnd(1000, 9999)))
    .replace("{ms}", String(rnd(12, 450)))
    .replace("{n}", String(rnd(1, 999)));
}

function LogLine({
  log,
  colors,
}: {
  log: LogEntry & { botName: string; botColor: string };
  colors: ReturnType<typeof useColors>;
}) {
  const levelColors: Record<string, string> = {
    info: colors.success,
    warn: colors.warning,
    error: colors.destructive,
    debug: colors.mutedForeground,
  };
  const lc = levelColors[log.level] ?? colors.mutedForeground;

  return (
    <View style={styles.logLine}>
      <Text style={[styles.logTime, { color: "#4a5568" }]}>
        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </Text>
      <Text style={[styles.logPrefix, { color: lc }]}>{LEVEL_PREFIXES[log.level] ?? "[ LOG  ]"}</Text>
      <Text style={[styles.logBot, { color: log.botColor }]}>[{log.botName}]</Text>
      <Text style={[styles.logMsg, { color: log.level === "error" ? colors.destructive : log.level === "warn" ? colors.warning : "#d4d4d8" }]} selectable>
        {log.message}
      </Text>
    </View>
  );
}

const BOT_COLORS = ["#5865f2", "#57f287", "#fee75c", "#eb459e", "#ed4245", "#00b0f4"];

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
  const [cmd, setCmd] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const botColorMap = Object.fromEntries(bots.map((b, i) => [b.id, BOT_COLORS[i % BOT_COLORS.length]]));

  const allLogs: (LogEntry & { botName: string; botColor: string })[] = bots
    .flatMap((b) =>
      b.logs.map((l) => ({
        ...l,
        botName: b.name,
        botId: b.id,
        botColor: botColorMap[b.id] ?? colors.primary,
      }))
    )
    .filter((l) => {
      if (selectedBotId !== "all" && (l as any).botId !== selectedBotId) return false;
      if (levelFilter !== "all" && l.level !== levelFilter) return false;
      if (search && !l.message.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-500);

  useEffect(() => {
    if (autoScroll && allLogs.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 80);
    }
  }, [allLogs.length, autoScroll]);

  const simulateLog = useCallback(() => {
    const activeBots = bots.filter((b) => b.status === "online" || b.status === "idle");
    if (activeBots.length === 0) return;
    const bot = activeBots[Math.floor(Math.random() * activeBots.length)];
    const isPython = bot.runtime.startsWith("python");
    const pool = isPython ? SIM_MESSAGES.python : SIM_MESSAGES.nodejs;
    const entry = pool[Math.floor(Math.random() * pool.length)];
    addLog(bot.id, entry.level, fillTemplate(entry.msg));
  }, [bots, addLog]);

  useEffect(() => {
    simulateLog();
    const t = setInterval(simulateLog, 1800);
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

  const handleCopyAll = async () => {
    const text = allLogs.map((l) => `[${new Date(l.timestamp).toISOString()}] ${LEVEL_PREFIXES[l.level]} [${l.botName}] ${l.message}`).join("\n");
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", `${allLogs.length} log lines copied to clipboard`);
  };

  const handleSendCmd = () => {
    if (!cmd.trim()) return;
    const targetBotId = selectedBotId === "all" ? (bots[0]?.id ?? "") : selectedBotId;
    if (!targetBotId) return;
    addLog(targetBotId, "info", `$ ${cmd.trim()}`);
    setCmdHistory((h) => [cmd.trim(), ...h.slice(0, 19)]);
    setCmd("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const levelColors: Record<string, string> = {
    all: colors.foreground,
    info: colors.success,
    warn: colors.warning,
    error: colors.destructive,
    debug: colors.mutedForeground,
  };

  const levelCounts = {
    info: allLogs.filter((l) => l.level === "info").length,
    warn: allLogs.filter((l) => l.level === "warn").length,
    error: allLogs.filter((l) => l.level === "error").length,
    debug: allLogs.filter((l) => l.level === "debug").length,
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: "#0a0c0f" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: topPad + 4, backgroundColor: "#111418", borderBottomColor: "#1e2124" }]}>
        <View style={styles.topLeft}>
          <View style={styles.termDots}>
            <View style={[styles.dot, { backgroundColor: "#ff5f57" }]} />
            <View style={[styles.dot, { backgroundColor: "#febc2e" }]} />
            <View style={[styles.dot, { backgroundColor: "#28c840" }]} />
          </View>
          <Text style={styles.title}>console</Text>
          <View style={[styles.livePill, { backgroundColor: colors.success + "22" }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.liveText, { color: colors.success }]}>LIVE</Text>
          </View>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => setShowSearch((x) => !x)} style={styles.iconBtn}>
            <Feather name="search" size={16} color={showSearch ? colors.primary : "#6b7280"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCopyAll} style={styles.iconBtn}>
            <Feather name="copy" size={16} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAutoScroll((x) => !x)} style={styles.iconBtn}>
            <Feather name="chevrons-down" size={16} color={autoScroll ? colors.primary : "#6b7280"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} style={styles.iconBtn}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bot selector tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: "#0e1114", borderBottomWidth: 1, borderBottomColor: "#1e2124", maxHeight: 40 }}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 4, alignItems: "center" }}
      >
        {[{ id: "all" as const, name: "All Bots", color: colors.primary }, ...bots.map((b, i) => ({ id: b.id, name: b.name, color: BOT_COLORS[i % BOT_COLORS.length] }))].map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => setSelectedBotId(item.id)}
            style={[
              styles.botTab,
              {
                borderBottomColor: selectedBotId === item.id ? item.color : "transparent",
                borderBottomWidth: 2,
              },
            ]}
          >
            <Text style={[styles.botTabText, { color: selectedBotId === item.id ? item.color : "#6b7280" }]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Level filters */}
      <View style={[styles.levelBar, { backgroundColor: "#0e1114", borderBottomColor: "#1e2124" }]}>
        {(["all", "info", "warn", "error", "debug"] as LevelFilter[]).map((lvl) => (
          <TouchableOpacity
            key={lvl}
            onPress={() => setLevelFilter(lvl)}
            style={[styles.lvlBtn, levelFilter === lvl && { backgroundColor: (levelColors[lvl] ?? "#fff") + "15" }]}
          >
            <Text style={[styles.lvlText, { color: levelFilter === lvl ? levelColors[lvl] : "#4a5568" }]}>
              {lvl.toUpperCase()}
            </Text>
            {lvl !== "all" && (levelCounts as any)[lvl] > 0 && (
              <View style={[styles.lvlCount, { backgroundColor: (levelColors[lvl] ?? "#fff") + "22" }]}>
                <Text style={[styles.lvlCountText, { color: levelColors[lvl] }]}>{(levelCounts as any)[lvl]}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
        <Text style={styles.lineCount}>{allLogs.length} lines</Text>
      </View>

      {/* Search */}
      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: "#111418", borderBottomColor: "#1e2124" }]}>
          <Feather name="search" size={13} color="#6b7280" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="grep logs..."
            placeholderTextColor="#4a5568"
            style={styles.searchInput}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={13} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Log output */}
      <FlatList
        ref={flatRef}
        data={allLogs}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => <LogLine log={item} colors={colors} />}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 8, gap: 0 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyPrompt}>{"$"} waiting for logs...</Text>
            <Text style={styles.emptySub}>Start a bot to see its output here</Text>
          </View>
        }
        style={{ flex: 1 }}
      />

      {/* Command input */}
      <View style={[styles.cmdBar, { backgroundColor: "#111418", borderTopColor: "#1e2124", paddingBottom: insets.bottom + 8 }]}>
        <Text style={styles.cmdPrompt}>
          {selectedBotId === "all" ? ">" : bots.find((b) => b.id === selectedBotId)?.name.toLowerCase().replace(/\s/g, "-") ?? ">"}{" $"}
        </Text>
        <TextInput
          value={cmd}
          onChangeText={setCmd}
          onSubmitEditing={handleSendCmd}
          placeholder="Enter command..."
          placeholderTextColor="#4a5568"
          style={styles.cmdInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="send"
        />
        <TouchableOpacity onPress={handleSendCmd} style={[styles.sendBtn, { backgroundColor: cmd.trim() ? colors.primary : "#1e2124" }]}>
          <Feather name="send" size={14} color={cmd.trim() ? "#fff" : "#4a5568"} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1 },
  topLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  termDots: { flexDirection: "row", gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#9ca3af", letterSpacing: 0.3 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveDot: { width: 5, height: 5, borderRadius: 2.5 },
  liveText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  topActions: { flexDirection: "row", gap: 4 },
  iconBtn: { padding: 6 },
  botTab: { paddingHorizontal: 10, paddingVertical: 10 },
  botTabText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  levelBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 1, gap: 2 },
  lvlBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  lvlText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  lvlCount: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  lvlCountText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  lineCount: { marginLeft: "auto", fontSize: 10, color: "#4a5568", fontFamily: "Inter_400Regular" },
  searchBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 7, gap: 8, borderBottomWidth: 1 },
  searchInput: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#d4d4d8", padding: 0 },
  logLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", paddingHorizontal: 12, paddingVertical: 2.5, gap: 6 },
  logTime: { fontSize: 10, fontFamily: "Inter_400Regular", minWidth: 65 },
  logPrefix: { fontSize: 10, fontFamily: "Inter_700Bold", minWidth: 60 },
  logBot: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  logMsg: { fontSize: 12, fontFamily: "Inter_400Regular", flexShrink: 1, lineHeight: 18 },
  empty: { flex: 1, alignItems: "flex-start", paddingTop: 32, paddingHorizontal: 16, gap: 6 },
  emptyPrompt: { fontSize: 13, color: "#23a55a", fontFamily: "Inter_400Regular" },
  emptySub: { fontSize: 11, color: "#4a5568", fontFamily: "Inter_400Regular" },
  cmdBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, gap: 8, borderTopWidth: 1 },
  cmdPrompt: { fontSize: 13, color: "#23a55a", fontFamily: "Inter_600SemiBold" },
  cmdInput: { flex: 1, fontSize: 13, color: "#d4d4d8", fontFamily: "Inter_400Regular", padding: 0 },
  sendBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  surface: {},
});
