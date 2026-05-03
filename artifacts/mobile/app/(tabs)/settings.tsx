import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBots } from "@/context/BotsContext";
import { useNotifications } from "@/context/NotificationsContext";
import { useSettings } from "@/context/SettingsContext";
import { useColors } from "@/hooks/useColors";

function SettingRow({
  icon,
  label,
  sub,
  value,
  onPress,
  toggle,
  onToggle,
  danger,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  sub?: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
  danger?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress && !onToggle}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, { backgroundColor: (danger ? colors.destructive : colors.primary) + "22" }]}>
        <Feather name={icon} size={16} color={danger ? colors.destructive : colors.primary} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
        {sub && <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{sub}</Text>}
      </View>
      {toggle !== undefined && onToggle ? (
        <Switch
          value={toggle}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      ) : value ? (
        <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>
      ) : onPress ? (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      ) : null}
    </TouchableOpacity>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  const { bots } = useBots();
  const { pushEnabled, requestPush } = useNotifications();
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const planColors: Record<string, string> = {
    free: colors.mutedForeground,
    starter: colors.success,
    pro: colors.primary,
    enterprise: colors.warning,
  };

  const handleTheme = () => {
    Alert.alert("Theme", undefined, [
      { text: "System", onPress: () => updateSettings({ theme: "system" }) },
      { text: "Dark", onPress: () => updateSettings({ theme: "dark" }) },
      { text: "Light", onPress: () => updateSettings({ theme: "light" }) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handlePlan = () => {
    Alert.alert("Upgrade Plan", "Choose your plan:", [
      { text: "Free (current)", style: "cancel" },
      { text: "Starter — $5/mo", onPress: () => { updateSettings({ plan: "starter" }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
      { text: "Pro — $15/mo", onPress: () => { updateSettings({ plan: "pro" }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
      { text: "Enterprise — $49/mo", onPress: () => { updateSettings({ plan: "enterprise" }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
    ]);
  };

  const maskedKey = settings.apiKey.slice(0, 10) + "••••••••••••••••••••" + settings.apiKey.slice(-4);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: insets.bottom + 100, paddingHorizontal: 16, gap: 8 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Settings</Text>

      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "33" }]}>
          <Feather name="user" size={28} color={colors.primary} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>BotHost User</Text>
          <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>user@example.com</Text>
          <TouchableOpacity
            onPress={handlePlan}
            style={[styles.planBadge, { backgroundColor: (planColors[settings.plan]) + "22", borderColor: planColors[settings.plan] }]}
          >
            <Text style={[styles.planText, { color: planColors[settings.plan] }]}>
              {settings.plan.charAt(0).toUpperCase() + settings.plan.slice(1)} Plan
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handlePlan}>
          <Feather name="arrow-up-circle" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Section title="APPEARANCE" colors={colors}>
        <SettingRow
          icon="moon"
          label="Theme"
          value={settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1)}
          onPress={handleTheme}
          colors={colors}
        />
      </Section>

      <Section title="NOTIFICATIONS" colors={colors}>
        <SettingRow
          icon="bell"
          label="Push Notifications"
          sub={
            Platform.OS === "web"
              ? "Available on iOS & Android"
              : pushEnabled
              ? "OS notifications enabled"
              : "Tap to grant permission"
          }
          toggle={settings.notifications && (Platform.OS === "web" || pushEnabled)}
          onToggle={async (v) => {
            if (v && !pushEnabled && Platform.OS !== "web") {
              const granted = await requestPush();
              if (!granted) {
                Alert.alert(
                  "Permission Required",
                  "Enable notifications in your device Settings to receive crash alerts.",
                  [{ text: "OK" }]
                );
                return;
              }
            }
            updateSettings({ notifications: v });
          }}
          colors={colors}
        />
        <SettingRow
          icon="alert-triangle"
          label="Crash Alerts"
          sub="Get notified when a bot crashes"
          toggle={settings.crashAlerts}
          onToggle={(v) => updateSettings({ crashAlerts: v })}
          colors={colors}
        />
        <SettingRow
          icon="cpu"
          label="RAM Alert Threshold"
          value={`${settings.ramAlertThreshold}%`}
          onPress={() =>
            Alert.alert("RAM Threshold", undefined, [
              { text: "75%", onPress: () => updateSettings({ ramAlertThreshold: 75 }) },
              { text: "85%", onPress: () => updateSettings({ ramAlertThreshold: 85 }) },
              { text: "90%", onPress: () => updateSettings({ ramAlertThreshold: 90 }) },
              { text: "95%", onPress: () => updateSettings({ ramAlertThreshold: 95 }) },
              { text: "Cancel", style: "cancel" },
            ])
          }
          colors={colors}
        />
        <SettingRow
          icon="activity"
          label="CPU Alert Threshold"
          value={`${settings.cpuAlertThreshold}%`}
          onPress={() =>
            Alert.alert("CPU Threshold", undefined, [
              { text: "75%", onPress: () => updateSettings({ cpuAlertThreshold: 75 }) },
              { text: "85%", onPress: () => updateSettings({ cpuAlertThreshold: 85 }) },
              { text: "90%", onPress: () => updateSettings({ cpuAlertThreshold: 90 }) },
              { text: "Cancel", style: "cancel" },
            ])
          }
          colors={colors}
        />
      </Section>

      <Section title="CONSOLE" colors={colors}>
        <SettingRow
          icon="chevrons-down"
          label="Auto-scroll Console"
          toggle={settings.autoScrollConsole}
          onToggle={(v) => updateSettings({ autoScrollConsole: v })}
          colors={colors}
        />
        <SettingRow
          icon="list"
          label="Max Log Lines"
          value={String(settings.consoleMaxLines)}
          onPress={() =>
            Alert.alert("Max Log Lines", undefined, [
              { text: "100", onPress: () => updateSettings({ consoleMaxLines: 100 }) },
              { text: "200", onPress: () => updateSettings({ consoleMaxLines: 200 }) },
              { text: "500", onPress: () => updateSettings({ consoleMaxLines: 500 }) },
              { text: "Cancel", style: "cancel" },
            ])
          }
          colors={colors}
        />
      </Section>

      <Section title="SECURITY" colors={colors}>
        <SettingRow
          icon="key"
          label="API Key"
          sub={apiKeyVisible ? settings.apiKey : maskedKey}
          onPress={() => setApiKeyVisible((x) => !x)}
          colors={colors}
        />
        <SettingRow
          icon="shield"
          label="Two-Factor Authentication"
          toggle={settings.twoFactorEnabled}
          onToggle={(v) => {
            updateSettings({ twoFactorEnabled: v });
            if (v) Alert.alert("2FA Enabled", "Two-factor authentication is now active.");
          }}
          colors={colors}
        />
        <SettingRow
          icon="refresh-cw"
          label="Regenerate API Key"
          sub="This will invalidate your current key"
          onPress={() =>
            Alert.alert("Regenerate API Key", "This will invalidate your current API key. Continue?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Regenerate",
                style: "destructive",
                onPress: () => {
                  updateSettings({ apiKey: "bh_live_" + Math.random().toString(36).slice(2).padEnd(32, "x") });
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
              },
            ])
          }
          colors={colors}
        />
      </Section>

      <Section title="DOMAINS" colors={colors}>
        <View style={[dStyles.domainsNote, { backgroundColor: colors.success + "11", borderColor: colors.success + "33" }]}>
          <Feather name="globe" size={14} color={colors.success} />
          <Text style={[dStyles.domainsNoteText, { color: colors.success }]}>
            All bots get a free .bothost.app subdomain with SSL included
          </Text>
        </View>
        {bots.map((bot) => {
          const domain = (bot as any).subdomain ?? `${bot.name.toLowerCase().replace(/\s+/g, "-")}.bothost.app`;
          return (
            <View key={bot.id} style={[dStyles.domainRow, { borderBottomColor: colors.border }]}>
              <View style={[dStyles.domainIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="cpu" size={13} color={colors.primary} />
              </View>
              <View style={dStyles.domainInfo}>
                <Text style={[dStyles.domainName, { color: colors.foreground }]} numberOfLines={1}>{domain}</Text>
                <Text style={[dStyles.domainBot, { color: colors.mutedForeground }]}>{bot.name}</Text>
              </View>
              <View style={[dStyles.sslBadge, { backgroundColor: colors.success + "18" }]}>
                <Feather name="lock" size={10} color={colors.success} />
                <Text style={[dStyles.sslText, { color: colors.success }]}>SSL</Text>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  await Clipboard.setStringAsync(`https://${domain}`);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              >
                <Feather name="copy" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          );
        })}
        {bots.length === 0 && (
          <View style={dStyles.noBotsRow}>
            <Text style={[dStyles.noBots, { color: colors.mutedForeground }]}>Create a bot to get your free subdomain</Text>
          </View>
        )}
        <SettingRow
          icon="plus-circle"
          label="Add Custom Domain"
          sub="Connect your own domain — Pro plan"
          onPress={() => Alert.alert("Custom Domains", "Custom domain support is available on the Pro plan.\n\nUpgrade to add domains like bot.yoursite.com", [
            { text: "Upgrade to Pro", onPress: () => { updateSettings({ plan: "pro" }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
            { text: "Cancel", style: "cancel" },
          ])}
          colors={colors}
        />
      </Section>

      <Section title="PLAN & BILLING" colors={colors}>
        <SettingRow
          icon="credit-card"
          label="Current Plan"
          value={settings.plan.charAt(0).toUpperCase() + settings.plan.slice(1)}
          onPress={handlePlan}
          colors={colors}
        />
        <SettingRow
          icon="arrow-up"
          label="Upgrade Plan"
          onPress={handlePlan}
          colors={colors}
        />
        <SettingRow
          icon="file-text"
          label="Billing History"
          onPress={() => Alert.alert("Billing History", "No invoices yet.")}
          colors={colors}
        />
      </Section>

      <Section title="TEAM" colors={colors}>
        <SettingRow
          icon="users"
          label="Team Members"
          value="1 member"
          onPress={() => Alert.alert("Team Members", "Invite team members to collaborate on your bots.\n\nAvailable on Starter plan and above.")}
          colors={colors}
        />
        <SettingRow
          icon="user-plus"
          label="Invite Member"
          onPress={() => Alert.alert("Invite", "Team collaboration available on paid plans.")}
          colors={colors}
        />
      </Section>

      <Section title="SUPPORT" colors={colors}>
        <SettingRow
          icon="message-circle"
          label="Support Tickets"
          sub="Get help from our team"
          onPress={() => Alert.alert("Support", "Open a support ticket at support.bothost.io")}
          colors={colors}
        />
        <SettingRow
          icon="book-open"
          label="Documentation"
          onPress={() => Linking.openURL("https://docs.bothost.io").catch(() => {})}
          colors={colors}
        />
        <SettingRow
          icon="globe"
          label="Status Page"
          sub="All systems operational"
          onPress={() => Linking.openURL("https://status.bothost.io").catch(() => {})}
          colors={colors}
        />
        <SettingRow
          icon="github"
          label="GitHub"
          onPress={() => Linking.openURL("https://github.com/bothost").catch(() => {})}
          colors={colors}
        />
      </Section>

      <Section title="ACCOUNT" colors={colors}>
        <SettingRow
          icon="log-out"
          label="Sign Out"
          onPress={() => Alert.alert("Sign Out", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Sign Out", style: "destructive" },
          ])}
          danger
          colors={colors}
        />
        <SettingRow
          icon="trash-2"
          label="Delete Account"
          sub="This action is irreversible"
          onPress={() => Alert.alert("Delete Account", "This will permanently delete all your bots and data.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive" },
          ])}
          danger
          colors={colors}
        />
      </Section>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>BotHost v1.0.0 · Free Plan</Text>
    </ScrollView>
  );
}

const dStyles = StyleSheet.create({
  domainsNote: { flexDirection: "row", alignItems: "center", gap: 8, margin: 12, padding: 10, borderRadius: 8, borderWidth: 1 },
  domainsNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  domainRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  domainIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  domainInfo: { flex: 1 },
  domainName: { fontSize: 12, fontFamily: "Inter_500Medium" },
  domainBot: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sslBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  sslText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  noBotsRow: { padding: 14 },
  noBots: { fontSize: 12, fontFamily: "Inter_400Regular" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 4 },
  profileCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1, gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  profileEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  planBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1, marginTop: 2 },
  planText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  section: { gap: 6 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, paddingLeft: 4 },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  rowSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  rowValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", paddingVertical: 8 },
});
