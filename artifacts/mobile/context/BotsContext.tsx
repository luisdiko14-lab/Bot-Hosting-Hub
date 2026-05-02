import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type BotStatus = "online" | "offline" | "idle" | "error" | "starting";
export type BotRuntime = "nodejs18" | "nodejs20" | "nodejs22" | "python39" | "python311" | "python312";
export type RamTier = 512 | 1024 | 2048 | 4096;
export type CpuCores = 1 | 2 | 4 | 8;

export interface EnvVar {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

export interface BotFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: "file" | "folder";
  lastModified: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
}

export interface Backup {
  id: string;
  name: string;
  createdAt: string;
  size: number;
  type: "manual" | "auto";
}

export interface WebhookEntry {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
}

export interface CronJob {
  id: string;
  name: string;
  expression: string;
  command: string;
  enabled: boolean;
  lastRun: string | null;
}

export interface Bot {
  id: string;
  name: string;
  token: string;
  status: BotStatus;
  runtime: BotRuntime;
  ramMb: RamTier;
  cpuCores: CpuCores;
  storageMb: number;
  uptimeSeconds: number;
  startedAt: string | null;
  autoRestart: boolean;
  maintenanceMode: boolean;
  envVars: EnvVar[];
  files: BotFile[];
  logs: LogEntry[];
  backups: Backup[];
  webhooks: WebhookEntry[];
  cronJobs: CronJob[];
  ramUsagePercent: number;
  cpuUsagePercent: number;
  ramHistory: number[];
  cpuHistory: number[];
  networkInMb: number;
  networkOutMb: number;
  commandCount: number;
  serverCount: number;
  userCount: number;
  errorRate: number;
  avgResponseMs: number;
  createdAt: string;
  discordVersion: "v9" | "v10";
  proxyEnabled: boolean;
  bandwidthGb: number;
  port: number;
}

interface BotsContextType {
  bots: Bot[];
  addBot: (bot: Omit<Bot, "id" | "createdAt" | "logs" | "backups" | "webhooks" | "cronJobs">) => void;
  removeBot: (id: string) => void;
  updateBot: (id: string, updates: Partial<Bot>) => void;
  startBot: (id: string) => void;
  stopBot: (id: string) => void;
  restartBot: (id: string) => void;
  addLog: (botId: string, level: LogEntry["level"], message: string) => void;
  addEnvVar: (botId: string, envVar: Omit<EnvVar, "id">) => void;
  updateEnvVar: (botId: string, envVarId: string, updates: Partial<EnvVar>) => void;
  removeEnvVar: (botId: string, envVarId: string) => void;
  addFile: (botId: string, file: Omit<BotFile, "id">) => void;
  removeFile: (botId: string, fileId: string) => void;
  renameFile: (botId: string, fileId: string, newName: string) => void;
  createBackup: (botId: string, name: string) => void;
  restoreBackup: (botId: string, backupId: string) => void;
  deleteBackup: (botId: string, backupId: string) => void;
  addWebhook: (botId: string, webhook: Omit<WebhookEntry, "id">) => void;
  removeWebhook: (botId: string, webhookId: string) => void;
  addCronJob: (botId: string, job: Omit<CronJob, "id">) => void;
  updateCronJob: (botId: string, jobId: string, updates: Partial<CronJob>) => void;
  removeCronJob: (botId: string, jobId: string) => void;
  upgradeRam: (botId: string, tier: RamTier) => void;
  upgradeCpu: (botId: string, cores: CpuCores) => void;
  upgradeStorage: (botId: string, additionalMb: number) => void;
  clearLogs: (botId: string) => void;
  generateInviteLink: (botId: string) => string;
  totalBots: number;
  onlineBots: number;
  totalRamUsedMb: number;
}

const BotsContext = createContext<BotsContextType | null>(null);

const STORAGE_KEY = "@bothost_bots";

const uid = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

const DEMO_BOTS: Bot[] = [
  {
    id: "bot1",
    name: "MusicBot Pro",
    token: "MTI4NDU2Nzg5MDEyMzQ1Njc4.XXXXXX.YYYYYYYY",
    status: "online",
    runtime: "nodejs20",
    ramMb: 1024,
    cpuCores: 2,
    storageMb: 2048,
    uptimeSeconds: 86400,
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    autoRestart: true,
    maintenanceMode: false,
    envVars: [
      { id: "e1", key: "DISCORD_TOKEN", value: "MTI4NDU2Nzg5MDEyMzQ1Njc4.XXXXXX", isSecret: true },
      { id: "e2", key: "PREFIX", value: "!", isSecret: false },
      { id: "e3", key: "NODE_ENV", value: "production", isSecret: false },
    ],
    files: [
      { id: "f1", name: "index.js", path: "/index.js", size: 4096, type: "file", lastModified: new Date().toISOString() },
      { id: "f2", name: "package.json", path: "/package.json", size: 512, type: "file", lastModified: new Date().toISOString() },
      { id: "f3", name: "commands", path: "/commands", size: 0, type: "folder", lastModified: new Date().toISOString() },
      { id: "f4", name: "node_modules", path: "/node_modules", size: 102400, type: "folder", lastModified: new Date().toISOString() },
    ],
    logs: [
      { id: "l1", timestamp: new Date(Date.now() - 3000).toISOString(), level: "info", message: "Bot started successfully" },
      { id: "l2", timestamp: new Date(Date.now() - 2000).toISOString(), level: "info", message: "Connected to Discord gateway" },
      { id: "l3", timestamp: new Date(Date.now() - 1000).toISOString(), level: "info", message: "Loaded 24 commands" },
      { id: "l4", timestamp: new Date().toISOString(), level: "debug", message: "Heartbeat acknowledged" },
    ],
    backups: [
      { id: "b1", name: "Daily Backup", createdAt: new Date(Date.now() - 86400000).toISOString(), size: 1048576, type: "auto" },
    ],
    webhooks: [
      { id: "w1", name: "Status Webhook", url: "https://discord.com/api/webhooks/xxx/yyy", events: ["bot.start", "bot.stop"], enabled: true },
    ],
    cronJobs: [
      { id: "c1", name: "Daily Restart", expression: "0 4 * * *", command: "restart", enabled: true, lastRun: new Date(Date.now() - 3600000).toISOString() },
    ],
    ramUsagePercent: 62,
    cpuUsagePercent: 28,
    ramHistory: Array.from({ length: 30 }, (_, i) => Math.max(10, Math.min(95, 55 + Math.sin(i * 0.4) * 15 + (Math.random() - 0.5) * 8))),
    cpuHistory: Array.from({ length: 30 }, (_, i) => Math.max(0, Math.min(100, 22 + Math.sin(i * 0.6) * 12 + (Math.random() - 0.5) * 10))),
    networkInMb: 145,
    networkOutMb: 89,
    commandCount: 1284,
    serverCount: 47,
    userCount: 3821,
    errorRate: 0.2,
    avgResponseMs: 42,
    createdAt: new Date(Date.now() - 2592000000).toISOString(),
    discordVersion: "v10",
    proxyEnabled: false,
    bandwidthGb: 10,
    port: 3001,
  },
  {
    id: "bot2",
    name: "ModeratorBot",
    token: "NTY4NDU2Nzg5MDEyMzQ1Njc4.AAAAAA.BBBBBBBB",
    status: "offline",
    runtime: "nodejs22",
    ramMb: 512,
    cpuCores: 1,
    storageMb: 1024,
    uptimeSeconds: 0,
    startedAt: null,
    autoRestart: false,
    maintenanceMode: false,
    envVars: [
      { id: "e1", key: "DISCORD_TOKEN", value: "NTY4NDU2Nzg5MDEyMzQ1Njc4.AAAAAA", isSecret: true },
      { id: "e2", key: "OWNER_ID", value: "123456789012345678", isSecret: false },
    ],
    files: [
      { id: "f1", name: "bot.js", path: "/bot.js", size: 8192, type: "file", lastModified: new Date().toISOString() },
      { id: "f2", name: "config.json", path: "/config.json", size: 256, type: "file", lastModified: new Date().toISOString() },
    ],
    logs: [
      { id: "l1", timestamp: new Date(Date.now() - 7200000).toISOString(), level: "warn", message: "Bot stopped by user" },
    ],
    backups: [],
    webhooks: [],
    cronJobs: [],
    ramUsagePercent: 0,
    cpuUsagePercent: 0,
    ramHistory: Array.from({ length: 30 }, () => 0),
    cpuHistory: Array.from({ length: 30 }, () => 0),
    networkInMb: 12,
    networkOutMb: 8,
    commandCount: 342,
    serverCount: 12,
    userCount: 891,
    errorRate: 1.1,
    avgResponseMs: 85,
    createdAt: new Date(Date.now() - 1296000000).toISOString(),
    discordVersion: "v10",
    proxyEnabled: false,
    bandwidthGb: 5,
    port: 3002,
  },
  {
    id: "bot3",
    name: "EconomyBot",
    token: "OTY4NDU2Nzg5MDEyMzQ1Njc4.CCCCCC.DDDDDDDD",
    status: "idle",
    runtime: "python311",
    ramMb: 2048,
    cpuCores: 4,
    storageMb: 4096,
    uptimeSeconds: 259200,
    startedAt: new Date(Date.now() - 259200000).toISOString(),
    autoRestart: true,
    maintenanceMode: false,
    envVars: [
      { id: "e1", key: "DISCORD_TOKEN", value: "OTY4NDU2Nzg5MDEyMzQ1Njc4.CCCCCC", isSecret: true },
      { id: "e2", key: "DATABASE_URL", value: "postgresql://localhost:5432/economy", isSecret: true },
      { id: "e3", key: "REDIS_URL", value: "redis://localhost:6379", isSecret: true },
      { id: "e4", key: "CURRENCY_NAME", value: "Coins", isSecret: false },
    ],
    files: [
      { id: "f1", name: "main.py", path: "/main.py", size: 12288, type: "file", lastModified: new Date().toISOString() },
      { id: "f2", name: "requirements.txt", path: "/requirements.txt", size: 512, type: "file", lastModified: new Date().toISOString() },
      { id: "f3", name: "cogs", path: "/cogs", size: 0, type: "folder", lastModified: new Date().toISOString() },
    ],
    logs: [
      { id: "l1", timestamp: new Date(Date.now() - 1000).toISOString(), level: "info", message: "Economy system initialized" },
      { id: "l2", timestamp: new Date(Date.now() - 500).toISOString(), level: "debug", message: "Database connection pool ready" },
    ],
    backups: [
      { id: "b1", name: "Weekly Backup", createdAt: new Date(Date.now() - 604800000).toISOString(), size: 5242880, type: "auto" },
      { id: "b2", name: "Pre-update Backup", createdAt: new Date(Date.now() - 172800000).toISOString(), size: 4194304, type: "manual" },
    ],
    webhooks: [],
    cronJobs: [
      { id: "c1", name: "Daily Interest", expression: "0 0 * * *", command: "add_interest", enabled: true, lastRun: new Date(Date.now() - 3600000).toISOString() },
      { id: "c2", name: "Weekly Leaderboard", expression: "0 12 * * 0", command: "post_leaderboard", enabled: true, lastRun: new Date(Date.now() - 172800000).toISOString() },
    ],
    ramUsagePercent: 45,
    cpuUsagePercent: 18,
    ramHistory: Array.from({ length: 30 }, (_, i) => Math.max(10, Math.min(95, 40 + Math.sin(i * 0.35) * 10 + (Math.random() - 0.5) * 6))),
    cpuHistory: Array.from({ length: 30 }, (_, i) => Math.max(0, Math.min(100, 15 + Math.cos(i * 0.5) * 8 + (Math.random() - 0.5) * 6))),
    networkInMb: 341,
    networkOutMb: 220,
    commandCount: 8921,
    serverCount: 128,
    userCount: 15420,
    errorRate: 0.05,
    avgResponseMs: 31,
    createdAt: new Date(Date.now() - 7776000000).toISOString(),
    discordVersion: "v10",
    proxyEnabled: true,
    bandwidthGb: 20,
    port: 3003,
  },
];

export function BotsProvider({ children }: { children: React.ReactNode }) {
  const [bots, setBots] = useState<Bot[]>(DEMO_BOTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data) as Bot[];
          if (parsed.length > 0) setBots(parsed);
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bots));
  }, [bots]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBots((prev) =>
        prev.map((bot) => {
          if (bot.status === "online" || bot.status === "idle") {
            const newRam = Math.max(10, Math.min(95, bot.ramUsagePercent + (Math.random() - 0.5) * 4));
            const newCpu = Math.max(0, Math.min(100, bot.cpuUsagePercent + (Math.random() - 0.5) * 8));
            return {
              ...bot,
              uptimeSeconds: bot.uptimeSeconds + 5,
              ramUsagePercent: newRam,
              cpuUsagePercent: newCpu,
              ramHistory: [...(bot.ramHistory ?? []).slice(-59), newRam],
              cpuHistory: [...(bot.cpuHistory ?? []).slice(-59), newCpu],
            };
          }
          return bot;
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const addBot = useCallback((bot: Omit<Bot, "id" | "createdAt" | "logs" | "backups" | "webhooks" | "cronJobs">) => {
    const newBot: Bot = {
      ...bot,
      id: uid(),
      createdAt: new Date().toISOString(),
      logs: [],
      backups: [],
      webhooks: [],
      cronJobs: [],
    };
    setBots((prev) => [...prev, newBot]);
  }, []);

  const removeBot = useCallback((id: string) => {
    setBots((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const updateBot = useCallback((id: string, updates: Partial<Bot>) => {
    setBots((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  }, []);

  const startBot = useCallback((id: string) => {
    setBots((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const log: LogEntry = {
          id: uid(),
          timestamp: new Date().toISOString(),
          level: "info",
          message: "Bot starting...",
        };
        setTimeout(() => {
          setBots((prev2) =>
            prev2.map((b2) => {
              if (b2.id !== id) return b2;
              return {
                ...b2,
                status: "online",
                startedAt: new Date().toISOString(),
                uptimeSeconds: 0,
                logs: [
                  ...b2.logs,
                  { id: uid(), timestamp: new Date().toISOString(), level: "info", message: "Connected to Discord gateway" },
                  { id: uid(), timestamp: new Date().toISOString(), level: "info", message: "Bot is ready" },
                ],
              };
            })
          );
        }, 2000);
        return { ...b, status: "starting" as BotStatus, logs: [...b.logs, log] };
      })
    );
  }, []);

  const stopBot = useCallback((id: string) => {
    setBots((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const log: LogEntry = {
          id: uid(),
          timestamp: new Date().toISOString(),
          level: "warn",
          message: "Bot stopped by user",
        };
        return { ...b, status: "offline" as BotStatus, startedAt: null, ramUsagePercent: 0, cpuUsagePercent: 0, logs: [...b.logs, log] };
      })
    );
  }, []);

  const restartBot = useCallback(
    (id: string) => {
      stopBot(id);
      setTimeout(() => startBot(id), 1000);
    },
    [startBot, stopBot]
  );

  const addLog = useCallback((botId: string, level: LogEntry["level"], message: string) => {
    const log: LogEntry = { id: uid(), timestamp: new Date().toISOString(), level, message };
    setBots((prev) => prev.map((b) => (b.id === botId ? { ...b, logs: [...b.logs.slice(-199), log] } : b)));
  }, []);

  const clearLogs = useCallback((botId: string) => {
    setBots((prev) => prev.map((b) => (b.id === botId ? { ...b, logs: [] } : b)));
  }, []);

  const addEnvVar = useCallback((botId: string, envVar: Omit<EnvVar, "id">) => {
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, envVars: [...b.envVars, { ...envVar, id: uid() }] } : b))
    );
  }, []);

  const updateEnvVar = useCallback((botId: string, envVarId: string, updates: Partial<EnvVar>) => {
    setBots((prev) =>
      prev.map((b) =>
        b.id === botId
          ? { ...b, envVars: b.envVars.map((e) => (e.id === envVarId ? { ...e, ...updates } : e)) }
          : b
      )
    );
  }, []);

  const removeEnvVar = useCallback((botId: string, envVarId: string) => {
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, envVars: b.envVars.filter((e) => e.id !== envVarId) } : b))
    );
  }, []);

  const addFile = useCallback((botId: string, file: Omit<BotFile, "id">) => {
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, files: [...b.files, { ...file, id: uid() }] } : b))
    );
  }, []);

  const removeFile = useCallback((botId: string, fileId: string) => {
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, files: b.files.filter((f) => f.id !== fileId) } : b))
    );
  }, []);

  const renameFile = useCallback((botId: string, fileId: string, newName: string) => {
    setBots((prev) =>
      prev.map((b) =>
        b.id === botId
          ? { ...b, files: b.files.map((f) => (f.id === fileId ? { ...f, name: newName } : f)) }
          : b
      )
    );
  }, []);

  const createBackup = useCallback((botId: string, name: string) => {
    const backup: Backup = {
      id: uid(),
      name,
      createdAt: new Date().toISOString(),
      size: Math.floor(Math.random() * 10485760) + 1048576,
      type: "manual",
    };
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, backups: [...b.backups, backup] } : b))
    );
  }, []);

  const restoreBackup = useCallback((botId: string, _backupId: string) => {
    setBots((prev) =>
      prev.map((b) => {
        if (b.id !== botId) return b;
        const log: LogEntry = {
          id: uid(),
          timestamp: new Date().toISOString(),
          level: "info",
          message: "Backup restored successfully",
        };
        return { ...b, logs: [...b.logs, log] };
      })
    );
  }, []);

  const deleteBackup = useCallback((botId: string, backupId: string) => {
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, backups: b.backups.filter((bk) => bk.id !== backupId) } : b))
    );
  }, []);

  const addWebhook = useCallback((botId: string, webhook: Omit<WebhookEntry, "id">) => {
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, webhooks: [...b.webhooks, { ...webhook, id: uid() }] } : b))
    );
  }, []);

  const removeWebhook = useCallback((botId: string, webhookId: string) => {
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, webhooks: b.webhooks.filter((w) => w.id !== webhookId) } : b))
    );
  }, []);

  const addCronJob = useCallback((botId: string, job: Omit<CronJob, "id">) => {
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, cronJobs: [...b.cronJobs, { ...job, id: uid() }] } : b))
    );
  }, []);

  const updateCronJob = useCallback((botId: string, jobId: string, updates: Partial<CronJob>) => {
    setBots((prev) =>
      prev.map((b) =>
        b.id === botId
          ? { ...b, cronJobs: b.cronJobs.map((j) => (j.id === jobId ? { ...j, ...updates } : j)) }
          : b
      )
    );
  }, []);

  const removeCronJob = useCallback((botId: string, jobId: string) => {
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, cronJobs: b.cronJobs.filter((j) => j.id !== jobId) } : b))
    );
  }, []);

  const upgradeRam = useCallback((botId: string, tier: RamTier) => {
    setBots((prev) =>
      prev.map((b) => {
        if (b.id !== botId) return b;
        const log: LogEntry = {
          id: uid(),
          timestamp: new Date().toISOString(),
          level: "info",
          message: `RAM upgraded to ${tier}MB`,
        };
        return { ...b, ramMb: tier, logs: [...b.logs, log] };
      })
    );
  }, []);

  const upgradeCpu = useCallback((botId: string, cores: CpuCores) => {
    setBots((prev) =>
      prev.map((b) => {
        if (b.id !== botId) return b;
        const log: LogEntry = {
          id: uid(),
          timestamp: new Date().toISOString(),
          level: "info",
          message: `CPU upgraded to ${cores} cores`,
        };
        return { ...b, cpuCores: cores, logs: [...b.logs, log] };
      })
    );
  }, []);

  const upgradeStorage = useCallback((botId: string, additionalMb: number) => {
    setBots((prev) =>
      prev.map((b) => (b.id === botId ? { ...b, storageMb: b.storageMb + additionalMb } : b))
    );
  }, []);

  const generateInviteLink = useCallback(
    (botId: string) => {
      const bot = bots.find((b) => b.id === botId);
      const clientId = bot ? "1284567890123456789" : "0000000000000000000";
      return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
    },
    [bots]
  );

  const totalBots = bots.length;
  const onlineBots = bots.filter((b) => b.status === "online" || b.status === "idle").length;
  const totalRamUsedMb = bots.reduce((sum, b) => sum + Math.round((b.ramUsagePercent / 100) * b.ramMb), 0);

  return (
    <BotsContext.Provider
      value={{
        bots,
        addBot,
        removeBot,
        updateBot,
        startBot,
        stopBot,
        restartBot,
        addLog,
        clearLogs,
        addEnvVar,
        updateEnvVar,
        removeEnvVar,
        addFile,
        removeFile,
        renameFile,
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
        upgradeStorage,
        generateInviteLink,
        totalBots,
        onlineBots,
        totalRamUsedMb,
      }}
    >
      {children}
    </BotsContext.Provider>
  );
}

export function useBots() {
  const ctx = useContext(BotsContext);
  if (!ctx) throw new Error("useBots must be used within BotsProvider");
  return ctx;
}
