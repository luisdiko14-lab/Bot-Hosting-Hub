import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MetricBar } from "@/components/MetricBar";
import { SparklineChart } from "@/components/SparklineChart";
import { StatusBadge } from "@/components/StatusBadge";
import { useBots, type CpuCores, type EnvVar, type RamTier } from "@/context/BotsContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useColors } from "@/hooks/useColors";

function formatUptime(seconds: number): string {
  if (seconds === 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatBytes(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

function formatBackupSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

type Tab = "overview" | "resources" | "env" | "files" | "backups" | "webhooks" | "cron" | "analytics";

export default function BotDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { simulateCrash } = useNotifications();
  const {
    bots,
    startBot,
    stopBot,
    restartBot,
    updateBot,
    removeBot,
    addEnvVar,
    updateEnvVar,
    removeEnvVar,
    addFile,
    removeFile,
    createBackup,
    restoreBackup,
    deleteBackup,
    addWebhook,
    removeWebhook,
    addCronJob,
    updateCronJob,
    removeCronJob,
    upgradeRam,
    upgradeCpu,
    generateInviteLink,
  } = useBots();

  const bot = bots.find((b) => b.id === id);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [tokenVisible, setTokenVisible] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvVal, setNewEnvVal] = useState("");
  const [newEnvSecret, setNewEnvSecret] = useState(false);
  const [showEnvForm, setShowEnvForm] = useState(false);
  const [hiddenEnvIds, setHiddenEnvIds] = useState<Set<string>>(new Set());

  if (!bot) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Bot not found</Text>
      </View>
    );
  }

  const maskedToken = bot.token.slice(0, 12) + "•".repeat(16) + bot.token.slice(-6);

  const handleCopyToken = async () => {
    await Clipboard.setStringAsync(bot.token);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied", "Token copied to clipboard");
  };

  const handleInviteLink = async () => {
    const link = generateInviteLink(bot.id);
    await Clipboard.setStringAsync(link);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Invite Link", "Link copied to clipboard", [{ text: "OK" }]);
  };

  const handleDelete = () => {
    Alert.alert("Delete Bot", `Permanently delete "${bot.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          removeBot(bot.id);
          router.back();
        },
      },
    ]);
  };

  const handleAddEnv = () => {
    if (!newEnvKey.trim()) return;
    addEnvVar(bot.id, { key: newEnvKey.trim(), value: newEnvVal, isSecret: newEnvSecret });
    setNewEnvKey("");
    setNewEnvVal("");
    setNewEnvSecret(false);
    setShowEnvForm(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddFile = () => {
    const names = ["index.js", "handler.js", "config.json", "utils.py", "main.py"];
    const name = names[Math.floor(Math.random() * names.length)];
    addFile(bot.id, {
      name,
      path: `/${name}`,
      size: Math.floor(Math.random() * 20480) + 512,
      type: "file",
      lastModified: new Date().toISOString(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const TABS: { key: Tab; icon: React.ComponentProps<typeof Feather>["name"]; label: string }[] = [
    { key: "overview", icon: "home", label: "Overview" },
    { key: "resources", icon: "cpu", label: "Resources" },
    { key: "env", icon: "sliders", label: "Env" },
    { key: "files", icon: "folder", label: "Files" },
    { key: "backups", icon: "archive", label: "Backups" },
    { key: "webhooks", icon: "link", label: "Hooks" },
    { key: "cron", icon: "clock", label: "Cron" },
    { key: "analytics", icon: "bar-chart-2", label: "Analytics" },
  ];

  const isRunning = bot.status === "online" || bot.status === "idle" || bot.status === "starting";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{bot.name}</Text>
          <StatusBadge status={bot.status} size="sm" />
        </View>
        <TouchableOpacity onPress={handleDelete}>
          <Feather name="trash-2" size={18} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      {/* Control buttons */}
      <View style={[styles.controls, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.ctrlBtn, { backgroundColor: isRunning ? colors.destructive + "22" : colors.success + "22" }]}
          onPress={() => (isRunning ? stopBot(bot.id) : startBot(bot.id))}
        >
          <Feather name={isRunning ? "square" : "play"} size={16} color={isRunning ? colors.destructive : colors.success} />
          <Text style={[styles.ctrlText, { color: isRunning ? colors.destructive : colors.success }]}>
            {isRunning ? "Stop" : "Start"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ctrlBtn, { backgroundColor: colors.warning + "22" }]}
          onPress={() => restartBot(bot.id)}
        >
          <Feather name="refresh-cw" size={16} color={colors.warning} />
          <Text style={[styles.ctrlText, { color: colors.warning }]}>Restart</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ctrlBtn, { backgroundColor: colors.primary + "22" }]}
          onPress={handleInviteLink}
        >
          <Feather name="link" size={16} color={colors.primary} />
          <Text style={[styles.ctrlText, { color: colors.primary }]}>Invite</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ctrlBtn, { backgroundColor: (bot.maintenanceMode ? colors.warning : colors.surface) + "22" }]}
          onPress={() => updateBot(bot.id, { maintenanceMode: !bot.maintenanceMode })}
        >
          <Feather name="tool" size={16} color={bot.maintenanceMode ? colors.warning : colors.mutedForeground} />
          <Text style={[styles.ctrlText, { color: bot.maintenanceMode ? colors.warning : colors.mutedForeground }]}>
            Maint.
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ctrlBtn, { backgroundColor: colors.destructive + "18" }]}
          onPress={() => {
            Alert.alert(
              "Simulate Crash",
              `Force a random crash on "${bot.name}" to test the alert system?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Crash It",
                  style: "destructive",
                  onPress: () => simulateCrash(bot.id),
                },
              ]
            );
          }}
        >
          <Feather name="zap-off" size={16} color={colors.destructive} />
          <Text style={[styles.ctrlText, { color: colors.destructive }]}>Crash</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}
      >
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(t.key)}
          >
            <Feather name={t.icon} size={14} color={activeTab === t.key ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabText, { color: activeTab === t.key ? colors.primary : colors.mutedForeground }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <>
            {/* Subdomain card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Subdomain</Text>
                <View style={[styles.freeBadge, { backgroundColor: colors.success + "22", borderColor: colors.success + "55" }]}>
                  <Text style={[styles.freeBadgeText, { color: colors.success }]}>FREE</Text>
                </View>
              </View>
              <View style={[styles.subdomainBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Feather name="globe" size={14} color={colors.primary} />
                <Text style={[styles.subdomainText, { color: colors.foreground }]} selectable numberOfLines={1}>
                  {(bot as any).subdomain ?? `${bot.name.toLowerCase().replace(/\s+/g, "-")}.bothost.app`}
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    await Clipboard.setStringAsync(`https://${(bot as any).subdomain ?? `${bot.name.toLowerCase().replace(/\s+/g, "-")}.bothost.app`}`);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}
                >
                  <Feather name="copy" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                Your bot's status page is publicly accessible at this URL. SSL included.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Bot Info</Text>
              {[
                { label: "Runtime", value: bot.runtime.replace("nodejs", "Node.js v").replace("python", "Python ") },
                { label: "Discord API", value: bot.discordVersion },
                { label: "Port", value: String(bot.port) },
                { label: "Servers", value: bot.serverCount.toLocaleString() },
                { label: "Users", value: bot.userCount.toLocaleString() },
                { label: "Uptime", value: formatUptime(bot.uptimeSeconds) },
                { label: "Created", value: new Date(bot.createdAt).toLocaleDateString() },
                { label: "Bandwidth", value: `${bot.bandwidthGb} GB/mo` },
              ].map((row) => (
                <View key={row.label} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>{row.value}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Token</Text>
              <View style={[styles.tokenBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.tokenText, { color: tokenVisible ? colors.foreground : colors.mutedForeground }]} numberOfLines={1} selectable={tokenVisible}>
                  {tokenVisible ? bot.token : maskedToken}
                </Text>
              </View>
              <View style={styles.tokenActions}>
                <TouchableOpacity style={[styles.tokenBtn, { backgroundColor: colors.surface }]} onPress={() => setTokenVisible((x) => !x)}>
                  <Feather name={tokenVisible ? "eye-off" : "eye"} size={14} color={colors.mutedForeground} />
                  <Text style={[styles.tokenBtnText, { color: colors.mutedForeground }]}>{tokenVisible ? "Hide" : "Show"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tokenBtn, { backgroundColor: colors.primary + "22" }]} onPress={handleCopyToken}>
                  <Feather name="copy" size={14} color={colors.primary} />
                  <Text style={[styles.tokenBtnText, { color: colors.primary }]}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tokenBtn, { backgroundColor: colors.destructive + "22" }]}
                  onPress={() => Alert.alert("Regenerate Token", "This will invalidate the current token and require a bot restart.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Regenerate", style: "destructive", onPress: () => {
                      const newToken = "MTI4NDU2Nzg" + Math.random().toString(36).slice(2, 14) + "." + Math.random().toString(36).slice(2, 8).toUpperCase() + "." + Math.random().toString(36).slice(2, 18);
                      updateBot(bot.id, { token: newToken });
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }},
                  ])}
                >
                  <Feather name="refresh-cw" size={14} color={colors.destructive} />
                  <Text style={[styles.tokenBtnText, { color: colors.destructive }]}>Regen</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Settings</Text>
              <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Auto Restart</Text>
                <Switch
                  value={bot.autoRestart}
                  onValueChange={(v) => updateBot(bot.id, { autoRestart: v })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
              <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Maintenance Mode</Text>
                  <Text style={[styles.settingSub, { color: colors.mutedForeground }]}>Reject all commands</Text>
                </View>
                <Switch
                  value={bot.maintenanceMode}
                  onValueChange={(v) => updateBot(bot.id, { maintenanceMode: v })}
                  trackColor={{ false: colors.border, true: colors.warning }}
                  thumbColor="#fff"
                />
              </View>
              <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Proxy Enabled</Text>
                <Switch
                  value={bot.proxyEnabled}
                  onValueChange={(v) => updateBot(bot.id, { proxyEnabled: v })}
                  trackColor={{ false: colors.border, true: colors.success }}
                  thumbColor="#fff"
                />
              </View>
              <TouchableOpacity
                style={[styles.settingRow, { borderBottomColor: colors.border }]}
                onPress={() =>
                  Alert.alert("Discord API Version", undefined, [
                    { text: "v9", onPress: () => updateBot(bot.id, { discordVersion: "v9" }) },
                    { text: "v10 (recommended)", onPress: () => updateBot(bot.id, { discordVersion: "v10" }) },
                    { text: "Cancel", style: "cancel" },
                  ])
                }
              >
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Discord API Version</Text>
                <View style={styles.rowEnd}>
                  <Text style={[styles.settingVal, { color: colors.mutedForeground }]}>{bot.discordVersion}</Text>
                  <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() =>
                  Alert.alert("Change Runtime", undefined, [
                    { text: "Node.js 18", onPress: () => updateBot(bot.id, { runtime: "nodejs18" }) },
                    { text: "Node.js 20", onPress: () => updateBot(bot.id, { runtime: "nodejs20" }) },
                    { text: "Node.js 22", onPress: () => updateBot(bot.id, { runtime: "nodejs22" }) },
                    { text: "Python 3.9", onPress: () => updateBot(bot.id, { runtime: "python39" }) },
                    { text: "Python 3.11", onPress: () => updateBot(bot.id, { runtime: "python311" }) },
                    { text: "Python 3.12", onPress: () => updateBot(bot.id, { runtime: "python312" }) },
                    { text: "Cancel", style: "cancel" },
                  ])
                }
              >
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Runtime</Text>
                <View style={styles.rowEnd}>
                  <Text style={[styles.settingVal, { color: colors.mutedForeground }]}>
                    {bot.runtime.replace("nodejs", "Node ").replace("python", "Py ")}
                  </Text>
                  <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* RESOURCES TAB */}
        {activeTab === "resources" && (
          <>
            {/* RAM Sparkline */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>RAM Usage</Text>
                  <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                    Allocated: {formatBytes(bot.ramMb)} · Last 60s
                  </Text>
                </View>
                <View style={[styles.liveChip, { backgroundColor: colors.success + "22" }]}>
                  <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.liveText, { color: colors.success }]}>LIVE</Text>
                </View>
              </View>
              <SparklineChart
                data={bot.ramHistory ?? []}
                color={colors.primary}
                height={72}
                label="RAM"
                current={bot.ramUsagePercent}
                showGradient
              />
              <View style={styles.metricsRow}>
                <View style={[styles.metricPill, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.metricPillVal, { color: colors.foreground }]}>{formatBytes(bot.ramMb)}</Text>
                  <Text style={[styles.metricPillLbl, { color: colors.mutedForeground }]}>Allocated</Text>
                </View>
                <View style={[styles.metricPill, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.metricPillVal, { color: colors.foreground }]}>
                    {formatBytes(Math.round((bot.ramUsagePercent / 100) * bot.ramMb))}
                  </Text>
                  <Text style={[styles.metricPillLbl, { color: colors.mutedForeground }]}>Used</Text>
                </View>
                <View style={[styles.metricPill, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.metricPillVal, { color: colors.foreground }]}>
                    {formatBytes(Math.round(((100 - bot.ramUsagePercent) / 100) * bot.ramMb))}
                  </Text>
                  <Text style={[styles.metricPillLbl, { color: colors.mutedForeground }]}>Free</Text>
                </View>
              </View>
            </View>

            {/* CPU Sparkline */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>CPU Usage</Text>
                  <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                    {bot.cpuCores} core{bot.cpuCores > 1 ? "s" : ""} · Last 60s
                  </Text>
                </View>
                <View style={[styles.liveChip, { backgroundColor: colors.success + "22" }]}>
                  <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.liveText, { color: colors.success }]}>LIVE</Text>
                </View>
              </View>
              <SparklineChart
                data={bot.cpuHistory ?? []}
                color="#00b0f4"
                height={72}
                label="CPU"
                current={bot.cpuUsagePercent}
                showGradient
              />
              <View style={styles.metricsRow}>
                <View style={[styles.metricPill, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.metricPillVal, { color: colors.foreground }]}>{bot.cpuCores}x</Text>
                  <Text style={[styles.metricPillLbl, { color: colors.mutedForeground }]}>Cores</Text>
                </View>
                <View style={[styles.metricPill, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.metricPillVal, { color: colors.foreground }]}>{Math.round(bot.cpuUsagePercent)}%</Text>
                  <Text style={[styles.metricPillLbl, { color: colors.mutedForeground }]}>In Use</Text>
                </View>
                <View style={[styles.metricPill, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.metricPillVal, { color: colors.foreground }]}>{Math.round(100 - bot.cpuUsagePercent)}%</Text>
                  <Text style={[styles.metricPillLbl, { color: colors.mutedForeground }]}>Idle</Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Network & Storage</Text>
              <View style={styles.metricsGrid}>
                {[
                  { label: "Network In", value: `${bot.networkInMb} MB` },
                  { label: "Network Out", value: `${bot.networkOutMb} MB` },
                  { label: "Storage", value: formatBytes(bot.storageMb) },
                  { label: "Bandwidth", value: `${bot.bandwidthGb} GB/mo` },
                ].map((m) => (
                  <View key={m.label} style={[styles.metricCell, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.metricVal, { color: colors.foreground }]}>{m.value}</Text>
                    <Text style={[styles.metricLbl, { color: colors.mutedForeground }]}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Upgrade RAM</Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Current: {formatBytes(bot.ramMb)}</Text>
              {([512, 1024, 2048, 4096] as RamTier[]).map((tier) => (
                <TouchableOpacity
                  key={tier}
                  style={[
                    styles.upgradeRow,
                    { borderBottomColor: colors.border },
                    bot.ramMb === tier && { backgroundColor: colors.primary + "11" },
                  ]}
                  onPress={() => {
                    upgradeRam(bot.id, tier);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert("Upgraded", `RAM set to ${formatBytes(tier)}`);
                  }}
                >
                  <View style={styles.upgradeInfo}>
                    <Text style={[styles.upgradeName, { color: colors.foreground }]}>{formatBytes(tier)}</Text>
                    <Text style={[styles.upgradeSub, { color: colors.mutedForeground }]}>
                      {tier === 512 ? "Free" : tier === 1024 ? "$2/mo" : tier === 2048 ? "$5/mo" : "$12/mo"}
                    </Text>
                  </View>
                  {bot.ramMb === tier ? (
                    <View style={[styles.currentBadge, { backgroundColor: colors.primary + "22" }]}>
                      <Text style={[styles.currentText, { color: colors.primary }]}>Active</Text>
                    </View>
                  ) : (
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Upgrade CPU</Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Current: {bot.cpuCores} core{bot.cpuCores > 1 ? "s" : ""}</Text>
              {([1, 2, 4, 8] as CpuCores[]).map((cores) => (
                <TouchableOpacity
                  key={cores}
                  style={[
                    styles.upgradeRow,
                    { borderBottomColor: colors.border },
                    bot.cpuCores === cores && { backgroundColor: colors.primary + "11" },
                  ]}
                  onPress={() => {
                    upgradeCpu(bot.id, cores);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert("Upgraded", `CPU set to ${cores} core${cores > 1 ? "s" : ""}`);
                  }}
                >
                  <View style={styles.upgradeInfo}>
                    <Text style={[styles.upgradeName, { color: colors.foreground }]}>{cores} Core{cores > 1 ? "s" : ""}</Text>
                    <Text style={[styles.upgradeSub, { color: colors.mutedForeground }]}>
                      {cores === 1 ? "Free" : cores === 2 ? "$3/mo" : cores === 4 ? "$8/mo" : "$20/mo"}
                    </Text>
                  </View>
                  {bot.cpuCores === cores ? (
                    <View style={[styles.currentBadge, { backgroundColor: colors.primary + "22" }]}>
                      <Text style={[styles.currentText, { color: colors.primary }]}>Active</Text>
                    </View>
                  ) : (
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Process Manager</Text>
              {[
                { name: "Main Process", pid: bot.port + 100, mem: Math.round(bot.ramUsagePercent * 0.7), cpu: Math.round(bot.cpuUsagePercent * 0.8), status: bot.status },
                { name: "Worker Thread", pid: bot.port + 101, mem: Math.round(bot.ramUsagePercent * 0.3), cpu: Math.round(bot.cpuUsagePercent * 0.2), status: bot.status },
              ].map((proc) => (
                <View key={proc.pid} style={[styles.procRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.procInfo}>
                    <Text style={[styles.procName, { color: colors.foreground }]}>{proc.name}</Text>
                    <Text style={[styles.procPid, { color: colors.mutedForeground }]}>PID {proc.pid}</Text>
                  </View>
                  <Text style={[styles.procStat, { color: colors.mutedForeground }]}>{proc.mem}% MEM</Text>
                  <Text style={[styles.procStat, { color: colors.mutedForeground }]}>{proc.cpu}% CPU</Text>
                  <StatusBadge status={proc.status as any} size="sm" />
                </View>
              ))}
            </View>
          </>
        )}

        {/* ENV VARS TAB */}
        {activeTab === "env" && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Environment Variables</Text>
                <TouchableOpacity onPress={() => setShowEnvForm((x) => !x)}>
                  <Feather name={showEnvForm ? "x" : "plus"} size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
              {showEnvForm && (
                <View style={[styles.envForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    value={newEnvKey}
                    onChangeText={setNewEnvKey}
                    placeholder="KEY"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.envInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    autoCapitalize="characters"
                  />
                  <TextInput
                    value={newEnvVal}
                    onChangeText={setNewEnvVal}
                    placeholder="Value"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.envInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    secureTextEntry={newEnvSecret}
                  />
                  <View style={styles.envFormActions}>
                    <TouchableOpacity onPress={() => setNewEnvSecret((x) => !x)} style={styles.secretToggle}>
                      <Feather name={newEnvSecret ? "eye-off" : "eye"} size={14} color={colors.mutedForeground} />
                      <Text style={[styles.secretText, { color: colors.mutedForeground }]}>Secret</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.addEnvBtn, { backgroundColor: colors.primary }]}
                      onPress={handleAddEnv}
                    >
                      <Text style={styles.addEnvBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {bot.envVars.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No environment variables</Text>
              ) : (
                bot.envVars.map((env: EnvVar) => {
                  const hidden = hiddenEnvIds.has(env.id) || env.isSecret;
                  return (
                    <View key={env.id} style={[styles.envRow, { borderBottomColor: colors.border }]}>
                      <View style={styles.envKey}>
                        <Text style={[styles.envKeyText, { color: colors.primary }]}>{env.key}</Text>
                        {env.isSecret && <Feather name="lock" size={10} color={colors.mutedForeground} />}
                      </View>
                      <Text style={[styles.envVal, { color: colors.foreground }]} numberOfLines={1}>
                        {hidden ? "••••••••••" : env.value}
                      </Text>
                      <View style={styles.envActions}>
                        {env.isSecret && (
                          <TouchableOpacity
                            onPress={() => {
                              const next = new Set(hiddenEnvIds);
                              if (hidden) next.delete(env.id);
                              else next.add(env.id);
                              setHiddenEnvIds(next);
                            }}
                          >
                            <Feather name={hidden ? "eye" : "eye-off"} size={14} color={colors.mutedForeground} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => removeEnvVar(bot.id, env.id)}>
                          <Feather name="trash-2" size={14} color={colors.destructive} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        {/* FILES TAB */}
        {activeTab === "files" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Files</Text>
              <TouchableOpacity onPress={handleAddFile} style={[styles.addFileBtn, { backgroundColor: colors.primary }]}>
                <Feather name="upload" size={14} color="#fff" />
                <Text style={styles.addFileBtnText}>Upload</Text>
              </TouchableOpacity>
            </View>
            {bot.files.length === 0 ? (
              <View style={styles.uploadEmpty}>
                <Feather name="upload-cloud" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No files uploaded</Text>
                <TouchableOpacity style={[styles.addFileBtn, { backgroundColor: colors.primary }]} onPress={handleAddFile}>
                  <Text style={styles.addFileBtnText}>Upload File</Text>
                </TouchableOpacity>
              </View>
            ) : (
              bot.files.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.fileRow, { borderBottomColor: colors.border }]}
                  onLongPress={() =>
                    Alert.alert(f.name, undefined, [
                      { text: "Delete", style: "destructive", onPress: () => removeFile(bot.id, f.id) },
                      { text: "Cancel", style: "cancel" },
                    ])
                  }
                >
                  <View style={[styles.fileIcon, { backgroundColor: (f.type === "folder" ? colors.warning : colors.primary) + "22" }]}>
                    <Feather name={f.type === "folder" ? "folder" : "file-text"} size={14} color={f.type === "folder" ? colors.warning : colors.primary} />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>{f.name}</Text>
                    <Text style={[styles.fileSub, { color: colors.mutedForeground }]}>
                      {f.type === "folder" ? "Directory" : `${(f.size / 1024).toFixed(1)} KB`}
                    </Text>
                  </View>
                  <Feather name="more-vertical" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* BACKUPS TAB */}
        {activeTab === "backups" && (
          <>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.primary }]}
              onPress={() =>
                Alert.prompt("Create Backup", "Backup name:", (name) => {
                  if (name?.trim()) {
                    createBackup(bot.id, name.trim());
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                }, "plain-text", `Backup ${new Date().toLocaleDateString()}`)
              }
            >
              <Feather name="archive" size={18} color="#fff" />
              <Text style={styles.actionCardText}>Create Backup</Text>
            </TouchableOpacity>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Backups</Text>
              {bot.backups.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No backups yet</Text>
              ) : (
                bot.backups.map((bk) => (
                  <View key={bk.id} style={[styles.backupRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.bkIcon, { backgroundColor: (bk.type === "auto" ? colors.success : colors.primary) + "22" }]}>
                      <Feather name="archive" size={14} color={bk.type === "auto" ? colors.success : colors.primary} />
                    </View>
                    <View style={styles.bkInfo}>
                      <Text style={[styles.bkName, { color: colors.foreground }]}>{bk.name}</Text>
                      <Text style={[styles.bkSub, { color: colors.mutedForeground }]}>
                        {new Date(bk.createdAt).toLocaleString()} · {formatBackupSize(bk.size)} · {bk.type}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => restoreBackup(bot.id, bk.id)} style={[styles.bkBtn, { backgroundColor: colors.success + "22" }]}>
                      <Feather name="rotate-ccw" size={12} color={colors.success} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteBackup(bot.id, bk.id)} style={[styles.bkBtn, { backgroundColor: colors.destructive + "22" }]}>
                      <Feather name="trash-2" size={12} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* WEBHOOKS TAB */}
        {activeTab === "webhooks" && (
          <>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.primary }]}
              onPress={() => {
                addWebhook(bot.id, {
                  name: "Status Webhook",
                  url: "https://discord.com/api/webhooks/example",
                  events: ["bot.start", "bot.stop", "bot.error"],
                  enabled: true,
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
            >
              <Feather name="link" size={18} color="#fff" />
              <Text style={styles.actionCardText}>Add Webhook</Text>
            </TouchableOpacity>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Webhooks</Text>
              {bot.webhooks.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No webhooks configured</Text>
              ) : (
                bot.webhooks.map((wh) => (
                  <View key={wh.id} style={[styles.webhookRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.wkInfo}>
                      <Text style={[styles.wkName, { color: colors.foreground }]}>{wh.name}</Text>
                      <Text style={[styles.wkUrl, { color: colors.mutedForeground }]} numberOfLines={1}>{wh.url}</Text>
                      <View style={styles.wkEvents}>
                        {wh.events.map((e) => (
                          <View key={e} style={[styles.eventChip, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.eventText, { color: colors.mutedForeground }]}>{e}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => removeWebhook(bot.id, wh.id)}>
                      <Feather name="trash-2" size={14} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* CRON TAB */}
        {activeTab === "cron" && (
          <>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.primary }]}
              onPress={() => {
                addCronJob(bot.id, {
                  name: "Scheduled Task",
                  expression: "0 * * * *",
                  command: "echo hello",
                  enabled: true,
                  lastRun: null,
                });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
            >
              <Feather name="clock" size={18} color="#fff" />
              <Text style={styles.actionCardText}>Add Cron Job</Text>
            </TouchableOpacity>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Scheduled Jobs</Text>
              {bot.cronJobs.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No cron jobs scheduled</Text>
              ) : (
                bot.cronJobs.map((job) => (
                  <View key={job.id} style={[styles.cronRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.cronInfo}>
                      <Text style={[styles.cronName, { color: colors.foreground }]}>{job.name}</Text>
                      <Text style={[styles.cronExpr, { color: colors.primary }]}>{job.expression}</Text>
                      <Text style={[styles.cronCmd, { color: colors.mutedForeground }]}>{job.command}</Text>
                      {job.lastRun && (
                        <Text style={[styles.cronLast, { color: colors.mutedForeground }]}>
                          Last: {new Date(job.lastRun).toLocaleString()}
                        </Text>
                      )}
                    </View>
                    <Switch
                      value={job.enabled}
                      onValueChange={(v) => updateCronJob(bot.id, job.id, { enabled: v })}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#fff"
                    />
                    <TouchableOpacity onPress={() => removeCronJob(bot.id, job.id)}>
                      <Feather name="trash-2" size={14} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Performance</Text>
              {[
                { label: "Commands Executed", value: bot.commandCount.toLocaleString(), icon: "terminal" as const, color: colors.primary },
                { label: "Servers", value: bot.serverCount.toLocaleString(), icon: "server" as const, color: colors.success },
                { label: "Users Reached", value: bot.userCount.toLocaleString(), icon: "users" as const, color: "#00b0f4" },
                { label: "Avg Response Time", value: `${bot.avgResponseMs}ms`, icon: "zap" as const, color: colors.warning },
                { label: "Error Rate", value: `${bot.errorRate}%`, icon: "alert-circle" as const, color: colors.destructive },
                { label: "Network In", value: `${bot.networkInMb} MB`, icon: "arrow-down" as const, color: colors.success },
                { label: "Network Out", value: `${bot.networkOutMb} MB`, icon: "arrow-up" as const, color: colors.warning },
                { label: "Total Uptime", value: formatUptime(bot.uptimeSeconds), icon: "clock" as const, color: colors.primary },
              ].map((stat) => (
                <View key={stat.label} style={[styles.statRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.statIcon, { backgroundColor: stat.color + "22" }]}>
                    <Feather name={stat.icon} size={14} color={stat.color} />
                  </View>
                  <Text style={[styles.statLabel, { color: colors.foreground }]}>{stat.label}</Text>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Rate Limits</Text>
              <MetricBar label="Global Rate Limit" value={12} max={50} unit="/s" />
              <MetricBar label="API Calls (last hour)" value={847} max={5000} unit="" />
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                Discord allows 5000 API calls per hour per bot token
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Top Commands (mock)</Text>
              {[
                { cmd: "!play", count: 428 },
                { cmd: "!help", count: 312 },
                { cmd: "!skip", count: 201 },
                { cmd: "!queue", count: 187 },
                { cmd: "!stop", count: 156 },
              ].map((c) => (
                <View key={c.cmd} style={[styles.cmdRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.cmdName, { color: colors.primary }]}>{c.cmd}</Text>
                  <View style={styles.cmdBarWrap}>
                    <View style={[styles.cmdBar, { width: `${(c.count / 428) * 100}%`, backgroundColor: colors.primary + "44" }]} />
                  </View>
                  <Text style={[styles.cmdCount, { color: colors.mutedForeground }]}>{c.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  controls: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  ctrlBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 9 },
  ctrlText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tabBar: { maxHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 14 },
  tabText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  content: { flex: 1 },
  card: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 13, fontFamily: "Inter_500Medium" },
  tokenBox: { padding: 12, borderRadius: 8, borderWidth: 1 },
  tokenText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  tokenActions: { flexDirection: "row", gap: 8 },
  tokenBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 8 },
  tokenBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  settingLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  settingSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  settingVal: { fontSize: 13, fontFamily: "Inter_400Regular" },
  rowEnd: { flexDirection: "row", alignItems: "center", gap: 5 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricCell: { width: "30%", flex: 1, padding: 10, borderRadius: 8, alignItems: "center", gap: 4 },
  metricVal: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  metricLbl: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  upgradeRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  upgradeInfo: { flex: 1 },
  upgradeName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  upgradeSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  currentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  currentText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  procRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  procInfo: { flex: 1 },
  procName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  procPid: { fontSize: 11, fontFamily: "Inter_400Regular" },
  procStat: { fontSize: 11, fontFamily: "Inter_400Regular" },
  envForm: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
  envInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_400Regular" },
  envFormActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  secretToggle: { flexDirection: "row", alignItems: "center", gap: 5 },
  secretText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  addEnvBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8 },
  addEnvBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  envRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  envKey: { width: 120, flexDirection: "row", alignItems: "center", gap: 4 },
  envKeyText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  envVal: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  envActions: { flexDirection: "row", gap: 10 },
  fileRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  fileIcon: { width: 30, height: 30, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  fileSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  addFileBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addFileBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  uploadEmpty: { alignItems: "center", gap: 10, paddingVertical: 20 },
  actionCard: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12 },
  actionCardText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  backupRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  bkIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  bkInfo: { flex: 1 },
  bkName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  bkSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  bkBtn: { width: 28, height: 28, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  webhookRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  wkInfo: { flex: 1, gap: 3 },
  wkName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  wkUrl: { fontSize: 11, fontFamily: "Inter_400Regular" },
  wkEvents: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  eventChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  eventText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  cronRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  cronInfo: { flex: 1, gap: 2 },
  cronName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  cronExpr: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cronCmd: { fontSize: 11, fontFamily: "Inter_400Regular" },
  cronLast: { fontSize: 10, fontFamily: "Inter_400Regular" },
  statRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  statIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  statLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  statValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cmdRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  cmdName: { width: 70, fontSize: 12, fontFamily: "Inter_500Medium" },
  cmdBarWrap: { flex: 1, height: 8, backgroundColor: "transparent", borderRadius: 4, overflow: "hidden" },
  cmdBar: { height: "100%", borderRadius: 4 },
  cmdCount: { width: 30, fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 12 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  liveChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  metricsRow: { flexDirection: "row", gap: 8 },
  metricPill: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center", gap: 2 },
  metricPillVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  metricPillLbl: { fontSize: 10, fontFamily: "Inter_400Regular" },
  freeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  freeBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  subdomainBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  subdomainText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  surface: {},
});
