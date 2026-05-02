import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

interface Settings {
  theme: "system" | "dark" | "light";
  notifications: boolean;
  crashAlerts: boolean;
  ramAlertThreshold: number;
  cpuAlertThreshold: number;
  autoScrollConsole: boolean;
  consoleMaxLines: number;
  apiKey: string;
  twoFactorEnabled: boolean;
  plan: "free" | "starter" | "pro" | "enterprise";
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  isDark: boolean;
}

const defaultSettings: Settings = {
  theme: "dark",
  notifications: true,
  crashAlerts: true,
  ramAlertThreshold: 90,
  cpuAlertThreshold: 85,
  autoScrollConsole: true,
  consoleMaxLines: 200,
  apiKey: "bh_live_" + "x".repeat(32),
  twoFactorEnabled: false,
  plan: "free",
};

const SettingsContext = createContext<SettingsContextType | null>(null);
const SETTINGS_KEY = "@bothost_settings";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((data) => {
      if (data) {
        try {
          setSettings({ ...defaultSettings, ...JSON.parse(data) });
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const isDark =
    settings.theme === "dark" || (settings.theme === "system" && systemScheme === "dark");

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isDark }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
