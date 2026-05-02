import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import { useBots, type BotRuntime, type CpuCores, type RamTier } from "@/context/BotsContext";
import { useColors } from "@/hooks/useColors";

const TEMPLATES = [
  { id: "blank", name: "Blank", desc: "Start from scratch", icon: "square" as const },
  { id: "music", name: "Music Bot", desc: "Play music in voice channels", icon: "music" as const },
  { id: "moderation", name: "Moderation", desc: "Keep your server safe", icon: "shield" as const },
  { id: "economy", name: "Economy", desc: "Virtual currency system", icon: "dollar-sign" as const },
  { id: "utility", name: "Utility", desc: "Useful commands for everyone", icon: "tool" as const },
  { id: "welcome", name: "Welcome Bot", desc: "Greet new members", icon: "smile" as const },
];

export default function CreateBotScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addBot } = useBots();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [tokenVisible, setTokenVisible] = useState(false);
  const [template, setTemplate] = useState("blank");
  const [runtime, setRuntime] = useState<BotRuntime>("nodejs20");
  const [ram, setRam] = useState<RamTier>(512);
  const [cpu, setCpu] = useState<CpuCores>(1);
  const [storage, setStorage] = useState(1024);

  const runtimes: { value: BotRuntime; label: string }[] = [
    { value: "nodejs18", label: "Node.js 18 LTS" },
    { value: "nodejs20", label: "Node.js 20 LTS" },
    { value: "nodejs22", label: "Node.js 22" },
    { value: "python39", label: "Python 3.9" },
    { value: "python311", label: "Python 3.11" },
    { value: "python312", label: "Python 3.12" },
  ];

  const canNext = step === 0 ? name.trim().length > 0 && token.trim().length > 0 : true;

  const handleCreate = () => {
    if (!name.trim() || !token.trim()) {
      Alert.alert("Error", "Please fill in the bot name and token.");
      return;
    }
    addBot({
      name: name.trim(),
      token: token.trim(),
      status: "offline",
      runtime,
      ramMb: ram,
      cpuCores: cpu,
      storageMb: storage,
      uptimeSeconds: 0,
      startedAt: null,
      autoRestart: false,
      maintenanceMode: false,
      envVars: [
        { id: "env1", key: "DISCORD_TOKEN", value: token.trim(), isSecret: true },
        { id: "env2", key: "NODE_ENV", value: "production", isSecret: false },
      ],
      files: [],
      ramUsagePercent: 0,
      cpuUsagePercent: 0,
      networkInMb: 0,
      networkOutMb: 0,
      commandCount: 0,
      serverCount: 0,
      userCount: 0,
      errorRate: 0,
      avgResponseMs: 0,
      discordVersion: "v10",
      proxyEnabled: false,
      bandwidthGb: 5,
      port: 3000 + Math.floor(Math.random() * 1000),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Bot Created!", `"${name.trim()}" has been added. Start it from your bot list.`, [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  const STEPS = ["Bot Info", "Template", "Resources"];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Add Bot</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={[styles.stepBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {STEPS.map((s, i) => (
          <TouchableOpacity key={s} onPress={() => i < step + 1 && setStep(i)} style={styles.stepItem}>
            <View style={[styles.stepCircle, { backgroundColor: i <= step ? colors.primary : colors.surface }]}>
              {i < step ? (
                <Feather name="check" size={12} color="#fff" />
              ) : (
                <Text style={[styles.stepNum, { color: i === step ? "#fff" : colors.mutedForeground }]}>{i + 1}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, { color: i === step ? colors.primary : colors.mutedForeground }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 0: Bot Info */}
        {step === 0 && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Bot Details</Text>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Bot Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. My Awesome Bot"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Discord Bot Token</Text>
                <View style={styles.tokenRow}>
                  <TextInput
                    value={token}
                    onChangeText={setToken}
                    placeholder="MTI4NDU2Nzg5.XXXXXX.YYYYYYYY"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                    secureTextEntry={!tokenVisible}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setTokenVisible((x) => !x)} style={styles.tokenEye}>
                    <Feather name={tokenVisible ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
                  Get your token from discord.com/developers/applications
                </Text>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Runtime</Text>
              {runtimes.map((rt) => (
                <TouchableOpacity
                  key={rt.value}
                  style={[styles.selectRow, { borderBottomColor: colors.border }, runtime === rt.value && { backgroundColor: colors.primary + "11" }]}
                  onPress={() => setRuntime(rt.value)}
                >
                  <View style={[styles.radio, { borderColor: runtime === rt.value ? colors.primary : colors.border }]}>
                    {runtime === rt.value && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.selectLabel, { color: colors.foreground }]}>{rt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* STEP 1: Template */}
        {step === 1 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Choose a Template</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Start with a pre-built template or a blank project</Text>
            <View style={styles.templatesGrid}>
              {TEMPLATES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.templateCard,
                    { backgroundColor: colors.surface, borderColor: template === t.id ? colors.primary : colors.border },
                    template === t.id && { backgroundColor: colors.primary + "11" },
                  ]}
                  onPress={() => setTemplate(t.id)}
                >
                  <View style={[styles.templateIcon, { backgroundColor: (template === t.id ? colors.primary : colors.mutedForeground) + "22" }]}>
                    <Feather name={t.icon} size={20} color={template === t.id ? colors.primary : colors.mutedForeground} />
                  </View>
                  <Text style={[styles.templateName, { color: template === t.id ? colors.primary : colors.foreground }]}>{t.name}</Text>
                  <Text style={[styles.templateDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{t.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* STEP 2: Resources */}
        {step === 2 && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>RAM</Text>
              {([512, 1024, 2048, 4096] as RamTier[]).map((tier) => (
                <TouchableOpacity
                  key={tier}
                  style={[styles.selectRow, { borderBottomColor: colors.border }, ram === tier && { backgroundColor: colors.primary + "11" }]}
                  onPress={() => setRam(tier)}
                >
                  <View style={[styles.radio, { borderColor: ram === tier ? colors.primary : colors.border }]}>
                    {ram === tier && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={styles.resourceInfo}>
                    <Text style={[styles.selectLabel, { color: colors.foreground }]}>
                      {tier >= 1024 ? `${tier / 1024} GB` : `${tier} MB`}
                    </Text>
                    <Text style={[styles.resourcePrice, { color: colors.mutedForeground }]}>
                      {tier === 512 ? "Free" : tier === 1024 ? "$2/mo" : tier === 2048 ? "$5/mo" : "$12/mo"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>CPU Cores</Text>
              {([1, 2, 4, 8] as CpuCores[]).map((cores) => (
                <TouchableOpacity
                  key={cores}
                  style={[styles.selectRow, { borderBottomColor: colors.border }, cpu === cores && { backgroundColor: colors.primary + "11" }]}
                  onPress={() => setCpu(cores)}
                >
                  <View style={[styles.radio, { borderColor: cpu === cores ? colors.primary : colors.border }]}>
                    {cpu === cores && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={styles.resourceInfo}>
                    <Text style={[styles.selectLabel, { color: colors.foreground }]}>
                      {cores} Core{cores > 1 ? "s" : ""}
                    </Text>
                    <Text style={[styles.resourcePrice, { color: colors.mutedForeground }]}>
                      {cores === 1 ? "Free" : cores === 2 ? "$3/mo" : cores === 4 ? "$8/mo" : "$20/mo"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Storage</Text>
              {[512, 1024, 2048, 5120].map((mb) => (
                <TouchableOpacity
                  key={mb}
                  style={[styles.selectRow, { borderBottomColor: colors.border }, storage === mb && { backgroundColor: colors.primary + "11" }]}
                  onPress={() => setStorage(mb)}
                >
                  <View style={[styles.radio, { borderColor: storage === mb ? colors.primary : colors.border }]}>
                    {storage === mb && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={styles.resourceInfo}>
                    <Text style={[styles.selectLabel, { color: colors.foreground }]}>
                      {mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`}
                    </Text>
                    <Text style={[styles.resourcePrice, { color: colors.mutedForeground }]}>
                      {mb === 512 ? "Free" : mb === 1024 ? "Free" : mb === 2048 ? "$1/mo" : "$3/mo"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.primary + "11", borderColor: colors.primary + "33" }]}>
              <Text style={[styles.summaryTitle, { color: colors.primary }]}>Summary</Text>
              <Text style={[styles.summaryText, { color: colors.foreground }]}>{name || "Unnamed Bot"}</Text>
              <Text style={[styles.summaryText, { color: colors.mutedForeground }]}>
                {runtime.replace("nodejs", "Node.js ").replace("python", "Python ")} · {ram >= 1024 ? `${ram / 1024}GB` : `${ram}MB`} RAM · {cpu} core{cpu > 1 ? "s" : ""} · {storage >= 1024 ? `${storage / 1024}GB` : `${storage}MB`} storage
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        {step > 0 && (
          <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => setStep((s) => s - 1)}>
            <Text style={[styles.backBtnText, { color: colors.foreground }]}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: canNext ? colors.primary : colors.muted, flex: 1 }]}
          onPress={() => {
            if (step < 2) {
              setStep((s) => s + 1);
            } else {
              handleCreate();
            }
          }}
          disabled={!canNext}
        >
          <Text style={[styles.nextBtnText, { color: canNext ? "#fff" : colors.mutedForeground }]}>
            {step < 2 ? "Continue" : "Create Bot"}
          </Text>
          {step < 2 && <Feather name="arrow-right" size={16} color={canNext ? "#fff" : colors.mutedForeground} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  stepBar: { flexDirection: "row", justifyContent: "center", gap: 0, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  stepItem: { flex: 1, alignItems: "center", gap: 4 },
  stepCircle: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepNum: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  stepLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  card: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  fieldHint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  tokenRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tokenEye: { padding: 4 },
  selectRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  selectLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  resourceInfo: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resourcePrice: { fontSize: 13, fontFamily: "Inter_500Medium" },
  templatesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  templateCard: { width: "47%", padding: 12, borderRadius: 12, borderWidth: 1, gap: 6, alignItems: "center" },
  templateIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  templateName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  templateDesc: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  summaryCard: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  summaryTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  summaryText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  footer: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
  backBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  backBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  nextBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  muted: { backgroundColor: "transparent" },
});
