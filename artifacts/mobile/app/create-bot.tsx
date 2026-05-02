import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
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
  { id: "blank", name: "Blank", desc: "Start from scratch", icon: "square" as const, color: "#80848e" },
  { id: "music", name: "Music Bot", desc: "Play music in voice channels", icon: "music" as const, color: "#23a55a" },
  { id: "moderation", name: "Moderation", desc: "Keep your server safe", icon: "shield" as const, color: "#da373c" },
  { id: "economy", name: "Economy", desc: "Virtual currency system", icon: "dollar-sign" as const, color: "#f0b232" },
  { id: "utility", name: "Utility", desc: "Useful commands for everyone", icon: "tool" as const, color: "#00b0f4" },
  { id: "welcome", name: "Welcome Bot", desc: "Greet new members", icon: "smile" as const, color: "#5865f2" },
];

const BUILD_STEPS = [
  { icon: "server" as const, label: "Provisioning virtual machine", duration: 900 },
  { icon: "code" as const, label: "Installing runtime environment", duration: 1100 },
  { icon: "hard-drive" as const, label: "Setting up file system", duration: 700 },
  { icon: "shield" as const, label: "Configuring firewall rules", duration: 600 },
  { icon: "sliders" as const, label: "Loading environment variables", duration: 500 },
  { icon: "package" as const, label: "Installing dependencies", duration: 1400 },
  { icon: "link" as const, label: "Connecting to Discord gateway", duration: 800 },
  { icon: "zap" as const, label: "Starting bot process", duration: 700 },
];

function BuildingScreen({ botName, onComplete }: { botName: string; onComplete: () => void }) {
  const colors = useColors();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    let stepIndex = 0;
    let cancelled = false;

    function runStep() {
      if (cancelled || stepIndex >= BUILD_STEPS.length) {
        if (!cancelled) {
          setDone(true);
          Animated.spring(successAnim, { toValue: 1, useNativeDriver: true }).start();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(onComplete, 1400);
        }
        return;
      }
      setCurrentStep(stepIndex);
      setTimeout(() => {
        if (!cancelled) {
          setCompletedSteps((prev) => [...prev, stepIndex]);
          stepIndex++;
          runStep();
        }
      }, BUILD_STEPS[stepIndex].duration);
    }

    const t = setTimeout(runStep, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const progress = done ? 1 : completedSteps.length / BUILD_STEPS.length;

  return (
    <Animated.View style={[styles.buildScreen, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      {/* Header */}
      <View style={styles.buildHeader}>
        {done ? (
          <Animated.View style={[styles.successCircle, { backgroundColor: colors.success + "22", transform: [{ scale: successAnim }] }]}>
            <Feather name="check" size={32} color={colors.success} />
          </Animated.View>
        ) : (
          <View style={[styles.spinnerOuter, { borderColor: colors.primary + "33" }]}>
            <Animated.View style={[styles.spinnerInner, { borderTopColor: colors.primary, transform: [{ rotate: spin }] }]} />
            <View style={[styles.spinnerCore, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="cpu" size={22} color={colors.primary} />
            </View>
          </View>
        )}
        <Text style={[styles.buildTitle, { color: colors.foreground }]}>
          {done ? "Bot is online!" : "Building your bot..."}
        </Text>
        <Text style={[styles.buildSub, { color: colors.mutedForeground }]}>
          {done ? `"${botName}" is ready to use` : botName}
        </Text>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: done ? colors.success : colors.primary, width: `${Math.round(progress * 100)}%` as any },
            ]}
          />
        </View>
        <Text style={[styles.progressPct, { color: colors.mutedForeground }]}>
          {Math.round(progress * 100)}%
        </Text>
      </View>

      {/* Steps */}
      <View style={[styles.stepsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {BUILD_STEPS.map((step, i) => {
          const isCompleted = completedSteps.includes(i);
          const isCurrent = currentStep === i && !isCompleted;
          return (
            <View key={i} style={[styles.stepRow, { borderBottomColor: colors.border }]}>
              <View
                style={[
                  styles.stepIconWrap,
                  {
                    backgroundColor: isCompleted
                      ? colors.success + "22"
                      : isCurrent
                      ? colors.primary + "22"
                      : colors.surface + "55",
                  },
                ]}
              >
                {isCompleted ? (
                  <Feather name="check" size={13} color={colors.success} />
                ) : (
                  <Feather
                    name={step.icon}
                    size={13}
                    color={isCurrent ? colors.primary : colors.mutedForeground}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.stepText,
                  {
                    color: isCompleted
                      ? colors.success
                      : isCurrent
                      ? colors.foreground
                      : colors.mutedForeground,
                    fontFamily: isCurrent ? "Inter_500Medium" : "Inter_400Regular",
                  },
                ]}
              >
                {step.label}
              </Text>
              {isCurrent && (
                <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
              )}
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

export default function CreateBotScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addBot } = useBots();

  const [step, setStep] = useState(0);
  const [building, setBuilding] = useState(false);
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [tokenVisible, setTokenVisible] = useState(false);
  const [template, setTemplate] = useState("blank");
  const [runtime, setRuntime] = useState<BotRuntime>("nodejs20");
  const [ram, setRam] = useState<RamTier>(512);
  const [cpu, setCpu] = useState<CpuCores>(1);
  const [storage, setStorage] = useState(1024);

  const runtimes: { value: BotRuntime; label: string; sub: string }[] = [
    { value: "nodejs18", label: "Node.js 18 LTS", sub: "Stable · Recommended for older projects" },
    { value: "nodejs20", label: "Node.js 20 LTS", sub: "Current LTS · Recommended" },
    { value: "nodejs22", label: "Node.js 22", sub: "Latest · Cutting edge" },
    { value: "python39", label: "Python 3.9", sub: "Stable · Wide compatibility" },
    { value: "python311", label: "Python 3.11", sub: "Faster · Recommended for Python" },
    { value: "python312", label: "Python 3.12", sub: "Latest stable Python" },
  ];

  const canNext = step === 0 ? name.trim().length > 0 && token.trim().length > 0 : true;

  const handleCreate = () => {
    if (!name.trim() || !token.trim()) {
      Alert.alert("Error", "Please fill in the bot name and token.");
      return;
    }
    setBuilding(true);
  };

  const handleBuildComplete = () => {
    addBot({
      name: name.trim(),
      token: token.trim(),
      status: "online",
      runtime,
      ramMb: ram,
      cpuCores: cpu,
      storageMb: storage,
      uptimeSeconds: 0,
      startedAt: new Date().toISOString(),
      autoRestart: true,
      maintenanceMode: false,
      envVars: [
        { id: "env1", key: "DISCORD_TOKEN", value: token.trim(), isSecret: true },
        { id: "env2", key: "NODE_ENV", value: "production", isSecret: false },
      ],
      files: [
        { id: "fi1", name: "index.js", path: "/index.js", size: 4096, type: "file", lastModified: new Date().toISOString() },
        { id: "fi2", name: "package.json", path: "/package.json", size: 512, type: "file", lastModified: new Date().toISOString() },
      ],
      ramUsagePercent: 12,
      cpuUsagePercent: 5,
      ramHistory: Array.from({ length: 20 }, () => Math.random() * 15 + 5),
      cpuHistory: Array.from({ length: 20 }, () => Math.random() * 8 + 3),
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
    router.back();
  };

  const STEPS = ["Bot Info", "Template", "Resources"];

  if (building) {
    return (
      <View style={[styles.buildContainer, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <BuildingScreen botName={name.trim()} onComplete={handleBuildComplete} />
      </View>
    );
  }

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

      {/* Step progress */}
      <View style={[styles.stepBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <TouchableOpacity
              onPress={() => i < step && setStep(i)}
              style={[
                styles.stepCircle,
                { backgroundColor: i <= step ? colors.primary : colors.surface, borderWidth: i < step ? 0 : 2, borderColor: i === step ? colors.primary : colors.border },
              ]}
            >
              {i < step ? (
                <Feather name="check" size={12} color="#fff" />
              ) : (
                <Text style={[styles.stepNum, { color: i === step ? "#fff" : colors.mutedForeground }]}>{i + 1}</Text>
              )}
            </TouchableOpacity>
            <Text style={[styles.stepLabel, { color: i === step ? colors.primary : colors.mutedForeground }]}>{s}</Text>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepConnector, { backgroundColor: i < step ? colors.primary : colors.border }]} />
            )}
          </View>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120, gap: 14 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* STEP 0: Bot Info */}
        {step === 0 && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Bot Details</Text>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Bot Name *</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. My Awesome Bot"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: name.trim() ? colors.primary : colors.border, color: colors.foreground }]}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Discord Bot Token *</Text>
                <View style={styles.tokenRow}>
                  <TextInput
                    value={token}
                    onChangeText={setToken}
                    placeholder="Paste your bot token here"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { flex: 1, backgroundColor: colors.surface, borderColor: token.trim() ? colors.primary : colors.border, color: colors.foreground }]}
                    secureTextEntry={!tokenVisible}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setTokenVisible((x) => !x)} style={[styles.tokenEyeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Feather name={tokenVisible ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.hintBox, { backgroundColor: colors.primary + "11", borderColor: colors.primary + "33" }]}>
                  <Feather name="info" size={12} color={colors.primary} />
                  <Text style={[styles.fieldHint, { color: colors.primary }]}>
                    Get your token from discord.com/developers → Your App → Bot → Reset Token
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Runtime</Text>
              {runtimes.map((rt) => (
                <TouchableOpacity
                  key={rt.value}
                  style={[styles.selectRow, { borderBottomColor: colors.border }, runtime === rt.value && { backgroundColor: colors.primary + "0d" }]}
                  onPress={() => setRuntime(rt.value)}
                >
                  <View style={[styles.radio, { borderColor: runtime === rt.value ? colors.primary : colors.border }]}>
                    {runtime === rt.value && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.selectLabel, { color: colors.foreground }]}>{rt.label}</Text>
                    <Text style={[styles.selectSub, { color: colors.mutedForeground }]}>{rt.sub}</Text>
                  </View>
                  {rt.value === "nodejs20" && (
                    <View style={[styles.recommendedBadge, { backgroundColor: colors.primary + "22" }]}>
                      <Text style={[styles.recommendedText, { color: colors.primary }]}>Recommended</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* STEP 1: Template */}
        {step === 1 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Choose a Template</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              Start with a pre-built template or an empty project
            </Text>
            <View style={styles.templatesGrid}>
              {TEMPLATES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.templateCard,
                    { borderColor: template === t.id ? t.color : colors.border, backgroundColor: template === t.id ? t.color + "11" : colors.surface },
                  ]}
                  onPress={() => setTemplate(t.id)}
                >
                  <View style={[styles.templateIcon, { backgroundColor: t.color + "22" }]}>
                    <Feather name={t.icon} size={22} color={t.color} />
                  </View>
                  <Text style={[styles.templateName, { color: template === t.id ? t.color : colors.foreground }]}>{t.name}</Text>
                  <Text style={[styles.templateDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{t.desc}</Text>
                  {template === t.id && (
                    <View style={[styles.selectedCheck, { backgroundColor: t.color }]}>
                      <Feather name="check" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* STEP 2: Resources */}
        {step === 2 && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>RAM Allocation</Text>
              {([512, 1024, 2048, 4096] as RamTier[]).map((tier) => (
                <TouchableOpacity
                  key={tier}
                  style={[
                    styles.resourceRow,
                    { borderColor: ram === tier ? colors.primary : colors.border, backgroundColor: ram === tier ? colors.primary + "0d" : "transparent" },
                  ]}
                  onPress={() => setRam(tier)}
                >
                  <View style={[styles.radio, { borderColor: ram === tier ? colors.primary : colors.border }]}>
                    {ram === tier && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.selectLabel, { color: colors.foreground }]}>
                      {tier >= 1024 ? `${tier / 1024} GB` : `${tier} MB`}
                    </Text>
                    <Text style={[styles.selectSub, { color: colors.mutedForeground }]}>
                      {tier === 512 ? "Good for small bots" : tier === 1024 ? "Recommended for most bots" : tier === 2048 ? "Large bots & databases" : "Heavy workloads"}
                    </Text>
                  </View>
                  <View style={[styles.priceBadge, { backgroundColor: tier === 512 ? colors.success + "22" : colors.warning + "22" }]}>
                    <Text style={[styles.priceText, { color: tier === 512 ? colors.success : colors.warning }]}>
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
                  style={[
                    styles.resourceRow,
                    { borderColor: cpu === cores ? colors.primary : colors.border, backgroundColor: cpu === cores ? colors.primary + "0d" : "transparent" },
                  ]}
                  onPress={() => setCpu(cores)}
                >
                  <View style={[styles.radio, { borderColor: cpu === cores ? colors.primary : colors.border }]}>
                    {cpu === cores && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.selectLabel, { color: colors.foreground }]}>
                      {cores} Core{cores > 1 ? "s" : ""}
                    </Text>
                    <Text style={[styles.selectSub, { color: colors.mutedForeground }]}>
                      {cores === 1 ? "Single-threaded bots" : cores === 2 ? "Recommended for most" : cores === 4 ? "Heavy command processing" : "Maximum performance"}
                    </Text>
                  </View>
                  <View style={[styles.priceBadge, { backgroundColor: cores === 1 ? colors.success + "22" : colors.warning + "22" }]}>
                    <Text style={[styles.priceText, { color: cores === 1 ? colors.success : colors.warning }]}>
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
                  style={[
                    styles.resourceRow,
                    { borderColor: storage === mb ? colors.primary : colors.border, backgroundColor: storage === mb ? colors.primary + "0d" : "transparent" },
                  ]}
                  onPress={() => setStorage(mb)}
                >
                  <View style={[styles.radio, { borderColor: storage === mb ? colors.primary : colors.border }]}>
                    {storage === mb && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.selectLabel, { color: colors.foreground }]}>
                    {mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`}
                  </Text>
                  <View style={[styles.priceBadge, { backgroundColor: mb <= 1024 ? colors.success + "22" : colors.warning + "22" }]}>
                    <Text style={[styles.priceText, { color: mb <= 1024 ? colors.success : colors.warning }]}>
                      {mb === 512 ? "Free" : mb === 1024 ? "Free" : mb === 2048 ? "$1/mo" : "$3/mo"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Summary card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.primary + "11", borderColor: colors.primary + "33" }]}>
              <View style={styles.summaryRow}>
                <Feather name="cpu" size={16} color={colors.primary} />
                <Text style={[styles.summaryTitle, { color: colors.primary }]}>Deployment Summary</Text>
              </View>
              <View style={styles.summaryGrid}>
                {[
                  { label: "Bot Name", value: name || "—" },
                  { label: "Runtime", value: runtime.replace("nodejs", "Node.js ").replace("python", "Python ") },
                  { label: "RAM", value: ram >= 1024 ? `${ram / 1024} GB` : `${ram} MB` },
                  { label: "CPU", value: `${cpu} core${cpu > 1 ? "s" : ""}` },
                  { label: "Storage", value: storage >= 1024 ? `${storage / 1024} GB` : `${storage} MB` },
                  { label: "Template", value: TEMPLATES.find((t) => t.id === template)?.name ?? "Blank" },
                ].map((item) => (
                  <View key={item.label} style={styles.summaryItem}>
                    <Text style={[styles.summaryItemLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                    <Text style={[styles.summaryItemValue, { color: colors.foreground }]}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        {step > 0 && (
          <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={() => setStep((s) => s - 1)}>
            <Feather name="arrow-left" size={16} color={colors.foreground} />
            <Text style={[styles.backBtnText, { color: colors.foreground }]}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: canNext ? colors.primary : colors.muted, flex: 1, opacity: canNext ? 1 : 0.5 }]}
          onPress={() => {
            if (step < 2) setStep((s) => s + 1);
            else handleCreate();
          }}
          disabled={!canNext}
        >
          {step === 2 ? (
            <>
              <Feather name="zap" size={16} color="#fff" />
              <Text style={styles.nextBtnText}>Deploy Bot</Text>
            </>
          ) : (
            <>
              <Text style={styles.nextBtnText}>Continue</Text>
              <Feather name="arrow-right" size={16} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  buildContainer: { flex: 1, paddingHorizontal: 16 },
  buildScreen: { flex: 1, gap: 20 },
  buildHeader: { alignItems: "center", gap: 10, paddingTop: 20 },
  spinnerOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  spinnerInner: { position: "absolute", width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: "transparent", borderTopColor: "#5865f2" },
  spinnerCore: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  successCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  buildTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  buildSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  progressTrack: { width: "80%", height: 6, borderRadius: 3, overflow: "hidden", marginTop: 4 },
  progressFill: { height: "100%", borderRadius: 3 },
  progressPct: { fontSize: 12, fontFamily: "Inter_500Medium" },
  stepsCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  stepRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  stepIconWrap: { width: 28, height: 28, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  stepText: { flex: 1, fontSize: 13 },
  activeDot: { width: 7, height: 7, borderRadius: 3.5 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  stepBar: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: StyleSheet.hairlineWidth, gap: 0 },
  stepItem: { flex: 1, alignItems: "center", gap: 5, position: "relative" },
  stepCircle: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  stepNum: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  stepLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  stepConnector: { position: "absolute", top: 13, left: "50%", right: "-50%", height: 2 },
  card: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  hintBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, padding: 10, borderRadius: 8, borderWidth: 1 },
  fieldHint: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  input: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  tokenRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tokenEyeBtn: { width: 42, height: 42, borderWidth: 1.5, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  selectRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  resourceRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1.5, gap: 12, marginBottom: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  selectLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  selectSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  priceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priceText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  recommendedBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  recommendedText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  templatesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  templateCard: { width: "47%", padding: 12, borderRadius: 12, borderWidth: 1.5, gap: 6, alignItems: "center", position: "relative" },
  templateIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  templateName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  templateDesc: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  selectedCheck: { position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  summaryCard: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 12 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryItem: { width: "47%", gap: 2 },
  summaryItemLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryItemValue: { fontSize: 13, fontFamily: "Inter_500Medium" },
  footer: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  backBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  nextBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  muted: { backgroundColor: "transparent" },
});
