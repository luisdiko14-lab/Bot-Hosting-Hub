import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { CrashReason } from "@/context/NotificationsContext";

const REASON_TITLES: Record<CrashReason, string> = {
  ram_exceeded: "RAM Limit Exceeded",
  cpu_spike: "CPU Spike Detected",
  oom_killed: "Bot OOM-Killed",
  uncaught_exception: "Uncaught Exception",
  timeout: "Health Check Timed Out",
  segfault: "Segmentation Fault",
};

const REASON_EMOJI: Record<CrashReason, string> = {
  ram_exceeded: "⚠️",
  cpu_spike: "⚠️",
  oom_killed: "💀",
  uncaught_exception: "🔴",
  timeout: "⏱️",
  segfault: "💥",
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function sendCrashPushNotification(
  botName: string,
  reason: CrashReason,
  detail: string
): Promise<void> {
  if (Platform.OS === "web") return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  const emoji = REASON_EMOJI[reason];
  const title = REASON_TITLES[reason];

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${emoji} ${botName} crashed`,
      body: `${title}: ${detail}`,
      data: { botName, reason },
      sound: true,
      badge: 1,
    },
    trigger: null,
  });
}

export async function clearNotificationBadge(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.setBadgeCountAsync(0);
}
