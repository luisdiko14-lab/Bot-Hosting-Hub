import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNotifications,
  type CrashReason,
} from "@/context/NotificationsContext";
import { useColors } from "@/hooks/useColors";

const REASON_ICONS: Record<CrashReason, React.ComponentProps<typeof Feather>["name"]> = {
  ram_exceeded: "cpu",
  cpu_spike: "activity",
  oom_killed: "zap-off",
  uncaught_exception: "alert-circle",
  timeout: "clock",
  segfault: "alert-triangle",
};

const REASON_LABELS: Record<CrashReason, string> = {
  ram_exceeded: "RAM Threshold Exceeded",
  cpu_spike: "CPU Spike",
  oom_killed: "OOM Killed",
  uncaught_exception: "Uncaught Exception",
  timeout: "Health Check Timeout",
  segfault: "Segmentation Fault",
};

export function CrashAlertBanner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notifications, dismiss, restartFromNotification, dismissAll } = useNotifications();

  const activeNotif = notifications.find((n) => !n.dismissed);
  const pendingCount = notifications.filter((n) => !n.dismissed).length;

  const slideY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [shownId, setShownId] = useState<string | null>(null);

  useEffect(() => {
    if (activeNotif && activeNotif.id !== shownId) {
      setShownId(activeNotif.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Slide in
      Animated.parallel([
        Animated.spring(slideY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        slideOut(activeNotif.id);
      }, 8000);
      return () => clearTimeout(timer);
    }

    if (!activeNotif && shownId) {
      slideOut(null);
    }
  }, [activeNotif?.id]);

  const slideOut = (id: string | null) => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (id) setShownId(null);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && g.dy < 0,
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) slideY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -40) {
          if (activeNotif) {
            slideOut(activeNotif.id);
            setTimeout(() => dismiss(activeNotif.id), 300);
          }
        } else {
          Animated.spring(slideY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!activeNotif) return null;

  const icon = REASON_ICONS[activeNotif.reason] ?? "alert-circle";
  const label = REASON_LABELS[activeNotif.reason] ?? "Bot Crashed";
  const timeAgo = (() => {
    const secs = Math.floor((Date.now() - new Date(activeNotif.timestamp).getTime()) / 1000);
    if (secs < 5) return "just now";
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  })();

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          top: (Platform.OS === "web" ? 0 : insets.top) + 8,
          transform: [{ translateY: slideY }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.card, { backgroundColor: "#1a0d0d", borderColor: colors.destructive + "66" }]}>
        {/* Top row */}
        <View style={styles.top}>
          <View style={[styles.iconWrap, { backgroundColor: colors.destructive + "22" }]}>
            <Feather name={icon} size={16} color={colors.destructive} />
          </View>
          <View style={styles.topCenter}>
            <View style={styles.titleRow}>
              <View style={[styles.crashDot, { backgroundColor: colors.destructive }]} />
              <Text style={[styles.title, { color: colors.destructive }]}>BOT CRASHED</Text>
              {pendingCount > 1 && (
                <View style={[styles.countBadge, { backgroundColor: colors.destructive }]}>
                  <Text style={styles.countText}>+{pendingCount - 1}</Text>
                </View>
              )}
            </View>
            <Text style={styles.botName} numberOfLines={1}>{activeNotif.botName}</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              dismiss(activeNotif.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.closeBtn}
          >
            <Feather name="x" size={16} color="#ffffff66" />
          </TouchableOpacity>
        </View>

        {/* Crash type + detail */}
        <View style={[styles.reasonRow, { backgroundColor: colors.destructive + "11" }]}>
          <Text style={[styles.reasonLabel, { color: colors.destructive }]}>{label}</Text>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
        </View>
        <Text style={styles.detail} numberOfLines={2}>{activeNotif.detail}</Text>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.restartBtn, { backgroundColor: colors.destructive }]}
            onPress={() => {
              restartFromNotification(activeNotif.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
          >
            <Feather name="refresh-cw" size={14} color="#fff" />
            <Text style={styles.restartText}>Restart Now</Text>
          </TouchableOpacity>

          {pendingCount > 1 && (
            <TouchableOpacity
              style={[styles.dismissAllBtn, { borderColor: "#ffffff22" }]}
              onPress={() => {
                dismissAll();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={styles.dismissAllText}>Dismiss All ({pendingCount})</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.viewLogsBtn}
            onPress={() => dismiss(activeNotif.id)}
          >
            <Text style={styles.viewLogsText}>Dismiss</Text>
          </TouchableOpacity>
        </View>

        {/* Swipe hint */}
        <View style={styles.swipeHintRow}>
          <View style={[styles.swipeHint, { backgroundColor: "#ffffff22" }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    paddingBottom: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  topCenter: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  crashDot: { width: 6, height: 6, borderRadius: 3 },
  title: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  countBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  countText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  botName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#ffffff" },
  closeBtn: { padding: 4 },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  reasonLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  timeAgo: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#ffffff55" },
  detail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#ffffff88",
    paddingHorizontal: 14,
    paddingVertical: 8,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
    alignItems: "center",
  },
  restartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },
  restartText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  dismissAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
  },
  dismissAllText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#ffffff66",
  },
  viewLogsBtn: {
    marginLeft: "auto",
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  viewLogsText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#ffffff44",
  },
  swipeHintRow: { alignItems: "center", paddingBottom: 8 },
  swipeHint: { width: 32, height: 3, borderRadius: 2 },
});
