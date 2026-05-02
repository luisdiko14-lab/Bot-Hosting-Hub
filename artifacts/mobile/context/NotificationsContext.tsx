import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useBots } from "@/context/BotsContext";
import { useSettings } from "@/context/SettingsContext";

export type CrashReason =
  | "ram_exceeded"
  | "cpu_spike"
  | "oom_killed"
  | "uncaught_exception"
  | "timeout"
  | "segfault";

export interface CrashNotification {
  id: string;
  botId: string;
  botName: string;
  reason: CrashReason;
  detail: string;
  timestamp: string;
  dismissed: boolean;
  restarted: boolean;
}

interface NotificationsContextType {
  notifications: CrashNotification[];
  unreadCount: number;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  restartFromNotification: (id: string) => void;
  simulateCrash: (botId: string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const REASON_DETAILS: Record<CrashReason, (pct?: number, thresh?: number) => string> = {
  ram_exceeded: (pct, thresh) => `RAM usage hit ${pct ?? 96}% — exceeded ${thresh ?? 90}% threshold`,
  cpu_spike: (pct, thresh) => `CPU spiked to ${pct ?? 98}% — exceeded ${thresh ?? 85}% threshold`,
  oom_killed: () => "Process was OOM-killed by the kernel (out of memory)",
  uncaught_exception: () => "Uncaught exception — process exited with code 1",
  timeout: () => "Health check timed out after 30 seconds — no response",
  segfault: () => "Segmentation fault (core dumped) — signal SIGSEGV",
};

const SIM_REASONS: CrashReason[] = [
  "oom_killed",
  "uncaught_exception",
  "timeout",
  "segfault",
  "ram_exceeded",
  "cpu_spike",
];

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { bots, updateBot, addLog, startBot } = useBots();
  const { settings } = useSettings();
  const [notifications, setNotifications] = useState<CrashNotification[]>([]);

  // Track when each bot last crashed so we don't spam
  const lastCrashTime = useRef<Record<string, number>>({});

  const crashBot = useCallback(
    (botId: string, reason: CrashReason, pct?: number) => {
      const bot = bots.find((b) => b.id === botId);
      if (!bot) return;

      // Cooldown: don't crash same bot more than once per 30s
      const now = Date.now();
      if (lastCrashTime.current[botId] && now - lastCrashTime.current[botId] < 30000) return;
      lastCrashTime.current[botId] = now;

      const detail = REASON_DETAILS[reason](pct, settings.ramAlertThreshold);

      // Set bot to error state
      updateBot(botId, {
        status: "error",
        startedAt: null,
        ramUsagePercent: 0,
        cpuUsagePercent: 0,
      });

      // Add crash log
      addLog(botId, "error", `[CRASH] ${detail}`);
      addLog(botId, "error", `Process exited unexpectedly — auto-restart ${bot.autoRestart ? "queued" : "disabled"}`);

      // If auto-restart is on, restart after 5 seconds
      if (bot.autoRestart) {
        setTimeout(() => {
          startBot(botId);
          addLog(botId, "info", "Auto-restart triggered by crash handler");
        }, 5000);
      }

      // Add notification
      const notification: CrashNotification = {
        id: uid(),
        botId,
        botName: bot.name,
        reason,
        detail,
        timestamp: new Date().toISOString(),
        dismissed: false,
        restarted: false,
      };

      setNotifications((prev) => [notification, ...prev.slice(0, 49)]);
    },
    [bots, settings.ramAlertThreshold, updateBot, addLog, startBot]
  );

  // Monitor RAM threshold
  useEffect(() => {
    if (!settings.crashAlerts) return;
    bots.forEach((bot) => {
      if (bot.status !== "online" && bot.status !== "idle") return;
      if (bot.ramUsagePercent >= settings.ramAlertThreshold) {
        crashBot(bot.id, "ram_exceeded", Math.round(bot.ramUsagePercent));
      }
    });
  }, [bots, settings.crashAlerts, settings.ramAlertThreshold, crashBot]);

  // Monitor CPU threshold
  useEffect(() => {
    if (!settings.crashAlerts) return;
    bots.forEach((bot) => {
      if (bot.status !== "online" && bot.status !== "idle") return;
      if (bot.cpuUsagePercent >= settings.cpuAlertThreshold) {
        crashBot(bot.id, "cpu_spike", Math.round(bot.cpuUsagePercent));
      }
    });
  }, [bots, settings.crashAlerts, settings.cpuAlertThreshold, crashBot]);

  // Random crash simulation every 45–90 seconds
  useEffect(() => {
    const scheduleNext = () => {
      const delay = 45000 + Math.random() * 45000;
      return setTimeout(() => {
        if (!settings.crashAlerts) {
          scheduleNext();
          return;
        }
        const activeBots = bots.filter(
          (b) => b.status === "online" || b.status === "idle"
        );
        if (activeBots.length > 0) {
          const bot = activeBots[Math.floor(Math.random() * activeBots.length)];
          const reason = SIM_REASONS[Math.floor(Math.random() * SIM_REASONS.length)];
          crashBot(bot.id, reason);
        }
        scheduleNext();
      }, delay);
    };

    // First crash between 20-40s for demo visibility
    const firstTimeout = setTimeout(() => {
      if (!settings.crashAlerts) return;
      const activeBots = bots.filter(
        (b) => b.status === "online" || b.status === "idle"
      );
      if (activeBots.length > 0) {
        const bot = activeBots[Math.floor(Math.random() * activeBots.length)];
        crashBot(bot.id, "uncaught_exception");
      }
    }, 25000);

    const recurring = scheduleNext();
    return () => {
      clearTimeout(firstTimeout);
      clearTimeout(recurring);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, dismissed: true } : n))
    );
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, dismissed: true })));
  }, []);

  const restartFromNotification = useCallback(
    (id: string) => {
      const notif = notifications.find((n) => n.id === id);
      if (!notif) return;
      startBot(notif.botId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, restarted: true, dismissed: true } : n))
      );
    },
    [notifications, startBot]
  );

  const simulateCrash = useCallback(
    (botId: string) => {
      const reasons: CrashReason[] = ["oom_killed", "uncaught_exception", "segfault", "timeout"];
      const reason = reasons[Math.floor(Math.random() * reasons.length)];
      // Force-reset cooldown for simulation
      delete lastCrashTime.current[botId];
      crashBot(botId, reason);
    },
    [crashBot]
  );

  const unreadCount = notifications.filter((n) => !n.dismissed).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        dismiss,
        dismissAll,
        restartFromNotification,
        simulateCrash,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
