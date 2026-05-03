import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNotifications,
  type CrashNotification,
  type CrashReason,
} from "@/context/NotificationsContext";
import { useBots } from "@/context/BotsContext";
import { useColors } from "@/hooks/useColors";

type Filter = "all" | "unread" | "restarted" | string;

const REASON_META: Record<
  CrashReason,
  { label: string; icon: string; color: string }
> = {
  ram_exceeded: { label: "RAM Exceeded", icon: "database", color: "#f0b232" },
  cpu_spike: { label: "CPU Spike", icon: "cpu", color: "#f0b232" },
  oom_killed: { label: "OOM Killed", icon: "zap-off", color: "#da373c" },
  uncaught_exception: {
    label: "Uncaught Exception",
    icon: "alert-triangle",
    color: "#da373c",
  },
  timeout: { label: "Health Timeout", icon: "clock", color: "#f0b232" },
  segfault: { label: "Segfault", icon: "x-octagon", color: "#da373c" },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function absoluteTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function NotifCard({
  notif,
  onDismiss,
  onRestart,
}: {
  notif: CrashNotification;
  onDismiss: () => void;
  onRestart: () => void;
}) {
  const colors = useColors();
  const meta = REASON_META[notif.reason];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: notif.dismissed
            ? colors.border
            : meta.color + "44",
          borderWidth: 1,
          opacity: notif.dismissed ? 0.55 : 1,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View
          style={[styles.iconWrap, { backgroundColor: meta.color + "22" }]}
        >
          <Feather name={meta.icon as any} size={18} color={meta.color} />
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.cardTitleRow}>
            <Text
              style={[styles.botName, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {notif.botName}
            </Text>
            {notif.restarted && (
              <View
                style={[
                  styles.pill,
                  { backgroundColor: "#23a55a22" },
                ]}
              >
                <Feather name="check-circle" size={10} color="#23a55a" />
                <Text style={[styles.pillText, { color: "#23a55a" }]}>
                  Restarted
                </Text>
              </View>
            )}
            {notif.dismissed && !notif.restarted && (
              <View
                style={[
                  styles.pill,
                  { backgroundColor: colors.muted + "33" },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Dismissed
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.reasonLabel, { color: meta.color }]}>
            {meta.label}
          </Text>
        </View>
        <View style={styles.timeCol}>
          <Text style={[styles.relTime, { color: colors.mutedForeground }]}>
            {relativeTime(notif.timestamp)}
          </Text>
          <Text style={[styles.absTime, { color: colors.mutedForeground }]}>
            {absoluteTime(notif.timestamp)}
          </Text>
        </View>
      </View>

      <Text
        style={[styles.detail, { color: colors.mutedForeground }]}
        numberOfLines={2}
      >
        {notif.detail}
      </Text>

      {!notif.dismissed && !notif.restarted && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.restartBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              onRestart();
            }}
          >
            <Feather name="refresh-cw" size={13} color="#fff" />
            <Text style={styles.restartText}>Restart</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.dismissBtn,
              { backgroundColor: colors.surface + "44", borderColor: colors.border },
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onDismiss();
            }}
          >
            <Text style={[styles.dismissText, { color: colors.mutedForeground }]}>
              Dismiss
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function AlertsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, unreadCount, dismiss, dismissAll, restartFromNotification } =
    useNotifications();
  const { bots } = useBots();

  const [filter, setFilter] = useState<Filter>("all");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const uniqueBots = useMemo(() => {
    const seen = new Set<string>();
    return notifications
      .filter((n) => {
        if (seen.has(n.botId)) return false;
        seen.add(n.botId);
        return true;
      })
      .map((n) => ({ id: n.botId, name: n.botName }));
  }, [notifications]);

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((n) => !n.dismissed);
    if (filter === "restarted") return notifications.filter((n) => n.restarted);
    return notifications.filter((n) => n.botId === filter);
  }, [notifications, filter]);

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: "all", label: "All", count: notifications.length },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "restarted", label: "Restarted", count: notifications.filter((n) => n.restarted).length },
    ...uniqueBots.map((b) => ({
      key: b.id as Filter,
      label: b.name,
      count: notifications.filter((n) => n.botId === b.id).length,
    })),
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Alerts
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.headerBadge, { backgroundColor: "#da373c" }]}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => {
              Haptics.selectionAsync();
              dismissAll();
            }}
          >
            <Text style={[styles.clearText, { color: colors.primary }]}>
              Clear All
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.primary : colors.surface + "55",
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setFilter(f.key);
              }}
            >
              <Text
                style={[
                  styles.filterLabel,
                  { color: active ? "#fff" : colors.mutedForeground },
                ]}
              >
                {f.label}
              </Text>
              {(f.count ?? 0) > 0 && (
                <View
                  style={[
                    styles.filterCount,
                    {
                      backgroundColor: active ? "#ffffff33" : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      { color: active ? "#fff" : colors.mutedForeground },
                    ]}
                  >
                    {f.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: colors.primary + "22" },
              ]}
            >
              <Feather name="bell-off" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No alerts
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {filter === "all"
                ? "Crash events and warnings will appear here"
                : "No alerts match this filter"}
            </Text>
          </View>
        ) : (
          filtered.map((notif) => (
            <NotifCard
              key={notif.id}
              notif={notif}
              onDismiss={() => dismiss(notif.id)}
              onRestart={() => restartFromNotification(notif.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  headerBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  headerBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  clearBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  clearText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  filterBar: {
    flexGrow: 0,
    borderBottomWidth: 1,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  filterCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterCountText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  list: { padding: 16, gap: 12 },
  card: {
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: { flex: 1 },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  botName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  reasonLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pillText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  timeCol: { alignItems: "flex-end", gap: 2 },
  relTime: { fontSize: 12, fontFamily: "Inter_500Medium" },
  absTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  detail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    paddingLeft: 50,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    paddingLeft: 50,
  },
  restartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  restartText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  dismissBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  dismissText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 20,
  },
});
