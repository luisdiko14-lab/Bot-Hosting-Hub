import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBots, type Bot, type BotFile } from "@/context/BotsContext";
import { useColors } from "@/hooks/useColors";

function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fileIcon(file: BotFile) {
  if (file.type === "folder") return "folder";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["js", "ts", "jsx", "tsx"].includes(ext)) return "code";
  if (ext === "json") return "file-text";
  if (ext === "py") return "code";
  if (["txt", "md"].includes(ext)) return "file-text";
  if (ext === "env") return "lock";
  if (ext === "log") return "list";
  return "file";
}

function fileColor(file: BotFile, colors: ReturnType<typeof useColors>) {
  if (file.type === "folder") return colors.warning;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["js", "jsx"].includes(ext)) return "#f7df1e";
  if (["ts", "tsx"].includes(ext)) return "#3178c6";
  if (ext === "py") return "#3776ab";
  if (ext === "json") return colors.warning;
  if (ext === "env") return colors.success;
  if (ext === "md") return "#9ca3af";
  return colors.primary;
}

const NEW_FILE_TEMPLATES = [
  { label: "JavaScript", icon: "code" as const, ext: "js", content: `// index.js\nconsole.log('Hello, Discord!');\n` },
  { label: "TypeScript", icon: "code" as const, ext: "ts", content: `// index.ts\nconsole.log('Hello, Discord!');\n` },
  { label: "Python", icon: "code" as const, ext: "py", content: `# main.py\nprint('Hello, Discord!')\n` },
  { label: "JSON Config", icon: "file-text" as const, ext: "json", content: `{\n  "prefix": "!",\n  "token": ""\n}\n` },
  { label: "Env File", icon: "lock" as const, ext: "env", content: `DISCORD_TOKEN=\nPREFIX=!\n` },
  { label: "Markdown", icon: "file-text" as const, ext: "md", content: `# My Bot\n\nDescription here.\n` },
  { label: "Text File", icon: "file" as const, ext: "txt", content: `` },
  { label: "Empty File", icon: "file" as const, ext: "", content: `` },
];

const UPLOAD_FAKE = [
  { name: "handler.js", content: `module.exports = (client) => {\n  client.on('interactionCreate', async (i) => {\n    if (!i.isChatInputCommand()) return;\n  });\n};\n`, size: 512 },
  { name: "events.js", content: `const { readdirSync } = require('fs');\nconst path = require('path');\n\nmodule.exports = (client) => {\n  for (const file of readdirSync('./src/events')) {\n    const event = require(path.join('./src/events', file));\n    client.on(event.name, event.execute);\n  }\n};\n`, size: 1024 },
  { name: "utils.js", content: `function formatMs(ms) {\n  const d = Math.floor(ms / 86400000);\n  const h = Math.floor(ms / 3600000) % 24;\n  const m = Math.floor(ms / 60000) % 60;\n  const s = Math.floor(ms / 1000) % 60;\n  return [d&&\`\${d}d\`,h&&\`\${h}h\`,m&&\`\${m}m\`,\`\${s}s\`].filter(Boolean).join(' ');\n}\nmodule.exports = { formatMs };\n`, size: 768 },
  { name: "deploy-commands.js", content: `const { REST, Routes } = require('discord.js');\nconst { readdirSync } = require('fs');\n\nconst commands = [];\nfor (const file of readdirSync('./src/commands').filter(f => f.endsWith('.js'))) {\n  const cmd = require(\`./src/commands/\${file}\`);\n  commands.push(cmd.data.toJSON());\n}\n\nconst rest = new REST().setToken(process.env.DISCORD_TOKEN);\nrest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });\n`, size: 2048 },
];

function CreateFileModal({
  visible,
  botId,
  onClose,
  colors,
}: {
  visible: boolean;
  botId: string;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const { addFile } = useBots();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [step, setStep] = useState<"template" | "name">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof NEW_FILE_TEMPLATES)[0] | null>(null);

  const handleSelectTemplate = (tpl: (typeof NEW_FILE_TEMPLATES)[0]) => {
    setSelectedTemplate(tpl);
    setName(tpl.ext ? `new-file.${tpl.ext}` : "new-file");
    setContent(tpl.content);
    setStep("name");
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    addFile(botId, {
      name: name.trim(),
      path: `/${name.trim()}`,
      size: content.length,
      type: "file",
      lastModified: new Date().toISOString(),
      content,
    } as any);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setName("");
    setContent("");
    setStep("template");
    setSelectedTemplate(null);
    onClose();
  };

  const handleClose = () => {
    setName("");
    setContent("");
    setStep("template");
    setSelectedTemplate(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={[mStyles.overlay]}>
        <View style={[mStyles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={mStyles.header}>
            {step === "name" && (
              <TouchableOpacity onPress={() => setStep("template")}>
                <Feather name="arrow-left" size={18} color={colors.foreground} />
              </TouchableOpacity>
            )}
            <Text style={[mStyles.title, { color: colors.foreground }]}>
              {step === "template" ? "New File" : "Configure File"}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {step === "template" ? (
            <ScrollView contentContainerStyle={mStyles.templateGrid}>
              {NEW_FILE_TEMPLATES.map((tpl) => (
                <TouchableOpacity
                  key={tpl.ext + tpl.label}
                  style={[mStyles.templateCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => handleSelectTemplate(tpl)}
                >
                  <Feather name={tpl.icon} size={20} color={colors.primary} />
                  <Text style={[mStyles.templateLabel, { color: colors.foreground }]}>{tpl.label}</Text>
                  {tpl.ext && (
                    <Text style={[mStyles.templateExt, { color: colors.mutedForeground }]}>
                      .{tpl.ext}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingBottom: 20 }}>
              <View style={mStyles.field}>
                <Text style={[mStyles.label, { color: colors.mutedForeground }]}>File Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="filename.js"
                  placeholderTextColor={colors.mutedForeground}
                  style={[mStyles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  autoCorrect={false}
                  autoCapitalize="none"
                  autoFocus
                />
              </View>
              <View style={[mStyles.field, { flex: 1 }]}>
                <Text style={[mStyles.label, { color: colors.mutedForeground }]}>Initial Content (optional)</Text>
                <TextInput
                  value={content}
                  onChangeText={setContent}
                  placeholder="// Start typing..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  style={[mStyles.codeInput, { backgroundColor: "#0a0c0f", borderColor: colors.border, color: "#d4d4d8" }]}
                  autoCorrect={false}
                  autoCapitalize="none"
                  textAlignVertical="top"
                />
              </View>
              <TouchableOpacity
                style={[mStyles.createBtn, { backgroundColor: name.trim() ? colors.primary : colors.surface }]}
                onPress={handleCreate}
                disabled={!name.trim()}
              >
                <Feather name="plus" size={16} color="#fff" />
                <Text style={mStyles.createBtnText}>Create File</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function FileRow({
  file,
  botId,
  botName,
  colors,
}: {
  file: BotFile;
  botId: string;
  botName: string;
  colors: ReturnType<typeof useColors>;
}) {
  const { removeFile, renameFile } = useBots();
  const router = useRouter();
  const ic = fileColor(file, colors);

  const handleTap = () => {
    if (file.type === "folder") return;
    Haptics.selectionAsync();
    router.push({
      pathname: "/bot/file-editor",
      params: { botId, fileId: file.id, fileName: file.name },
    });
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(file.name, file.path, [
      {
        text: "Edit",
        onPress: handleTap,
      },
      {
        text: "Rename",
        onPress: () =>
          Alert.prompt("Rename", undefined, (n) => {
            if (n?.trim()) renameFile(botId, file.id, n.trim());
          }, "plain-text", file.name),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete File", `Delete "${file.name}"?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => removeFile(botId, file.id) },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.fileRow, { borderBottomColor: colors.border }]}
      onPress={handleTap}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.fileIcon, { backgroundColor: ic + "20" }]}>
        <Feather name={fileIcon(file)} size={15} color={ic} />
      </View>
      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={[styles.fileMeta, { color: colors.mutedForeground }]}>
          {file.type === "folder" ? "Directory" : formatSize(file.size)} ·{" "}
          {new Date(file.lastModified).toLocaleDateString()}
        </Text>
      </View>
      {file.type !== "folder" && (
        <TouchableOpacity
          onPress={handleTap}
          style={[styles.editBtn, { backgroundColor: colors.primary + "18" }]}
        >
          <Feather name="edit-2" size={12} color={colors.primary} />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={handleLongPress}>
        <Feather name="more-vertical" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function BotFileSection({ bot }: { bot: Bot }) {
  const colors = useColors();
  const { addFile } = useBots();
  const [expanded, setExpanded] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const totalSize = bot.files.filter((f) => f.type === "file").reduce((s, f) => s + f.size, 0);
  const storageMax = bot.storageMb * 1048576;

  const handleUpload = async () => {
    setUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const template = UPLOAD_FAKE[Math.floor(Math.random() * UPLOAD_FAKE.length)];
    setTimeout(() => {
      addFile(bot.id, {
        name: template.name,
        path: `/${template.name}`,
        size: template.size,
        type: "file",
        lastModified: new Date().toISOString(),
        content: template.content,
      } as any);
      setUploading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 800);
  };

  const handleNewFolder = () => {
    Alert.prompt("New Folder", "Enter folder name:", (name) => {
      if (name?.trim()) {
        addFile(bot.id, {
          name: name.trim(),
          path: `/${name.trim()}`,
          size: 0,
          type: "folder",
          lastModified: new Date().toISOString(),
        });
      }
    });
  };

  const usedPct = Math.min(100, (totalSize / storageMax) * 100);
  const barColor = usedPct > 85 ? colors.destructive : usedPct > 65 ? colors.warning : colors.primary;

  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.sectionHeader, { borderBottomColor: colors.border, borderBottomWidth: expanded ? StyleSheet.hairlineWidth : 0 }]}
        onPress={() => setExpanded((x) => !x)}
        activeOpacity={0.8}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
          <Feather name="cpu" size={15} color={colors.primary} />
        </View>
        <View style={styles.botMeta}>
          <Text style={[styles.botName, { color: colors.foreground }]}>{bot.name}</Text>
          <Text style={[styles.botSub, { color: colors.mutedForeground }]}>
            {bot.files.length} items · {formatSize(totalSize)} used
          </Text>
        </View>
        {expanded && (
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleUpload}
              style={[styles.actionBtn, { backgroundColor: colors.primary + "22" }]}
              disabled={uploading}
            >
              <Feather name={uploading ? "loader" : "upload"} size={13} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowCreateModal(true)}
              style={[styles.actionBtn, { backgroundColor: colors.success + "22" }]}
            >
              <Feather name="file-plus" size={13} color={colors.success} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNewFolder}
              style={[styles.actionBtn, { backgroundColor: colors.warning + "22" }]}
            >
              <Feather name="folder-plus" size={13} color={colors.warning} />
            </TouchableOpacity>
          </View>
        )}
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={17} color={colors.mutedForeground} />
      </TouchableOpacity>

      {expanded && (
        <>
          {bot.files.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyUpload, { borderColor: colors.border }]}
              onPress={handleUpload}
            >
              <Feather name="upload-cloud" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyUploadTitle, { color: colors.foreground }]}>Upload Files</Text>
              <Text style={[styles.emptyUploadSub, { color: colors.mutedForeground }]}>
                Tap to upload, or use "+" to create
              </Text>
            </TouchableOpacity>
          ) : (
            bot.files.map((f) => (
              <FileRow key={f.id} file={f} botId={bot.id} botName={bot.name} colors={colors} />
            ))
          )}

          {/* Storage bar */}
          <View style={[styles.storageRow, { backgroundColor: colors.surface }]}>
            <View style={{ flex: 1, gap: 5 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Feather name="hard-drive" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.storageText, { color: colors.mutedForeground }]}>
                    {formatSize(totalSize)} / {formatSize(storageMax)}
                  </Text>
                </View>
                <Text style={[styles.storageText, { color: barColor }]}>{usedPct.toFixed(1)}%</Text>
              </View>
              <View style={[styles.storageTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.storageFill, { width: `${usedPct}%` as any, backgroundColor: barColor }]} />
              </View>
            </View>
          </View>
        </>
      )}

      <CreateFileModal
        visible={showCreateModal}
        botId={bot.id}
        onClose={() => setShowCreateModal(false)}
        colors={colors}
      />
    </View>
  );
}

export default function FilesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bots } = useBots();
  const [search, setSearch] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const filtered = bots.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 12, backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Files</Text>
          <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
            Tap any file to read or edit
          </Text>
        </View>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16 }]}>
        <Feather name="search" size={14} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search bots..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => <BotFileSection bot={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 10 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="folder" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No bots found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 10 },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  pageSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  searchBar: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  section: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", padding: 13, gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  botMeta: { flex: 1 },
  botName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  botSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: { width: 28, height: 28, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  fileRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  fileIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  fileMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  editBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, marginRight: 2 },
  emptyUpload: { alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 28, margin: 14, borderRadius: 10, borderWidth: 1, borderStyle: "dashed" },
  emptyUploadTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyUploadSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  storageRow: { flexDirection: "row", alignItems: "center", padding: 10, gap: 10 },
  storageText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  storageTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  storageFill: { height: "100%", borderRadius: 2 },
  empty: { alignItems: "center", gap: 8, paddingTop: 80 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000088" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, maxHeight: "88%" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  templateGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 10, justifyContent: "space-between" },
  templateCard: { width: "47%", padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "center", gap: 6 },
  templateLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  templateExt: { fontSize: 11, fontFamily: "Inter_400Regular" },
  field: { gap: 6 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },
  input: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  codeInput: { borderWidth: 1, borderRadius: 9, padding: 12, fontSize: 12, fontFamily: "Inter_400Regular", minHeight: 140, lineHeight: 20 },
  createBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 10 },
  createBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
