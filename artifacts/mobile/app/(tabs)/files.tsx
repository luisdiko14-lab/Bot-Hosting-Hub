import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
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
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

function FileRow({ file, botId, colors }: { file: BotFile; botId: string; colors: ReturnType<typeof useColors> }) {
  const { removeFile, renameFile } = useBots();

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(file.name, undefined, [
      {
        text: "Rename",
        onPress: () => {
          Alert.prompt(
            "Rename File",
            undefined,
            (name) => { if (name?.trim()) renameFile(botId, file.id, name.trim()); },
            "plain-text",
            file.name
          );
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => removeFile(botId, file.id),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.fileRow, { borderBottomColor: colors.border }]}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.fileIcon, { backgroundColor: (file.type === "folder" ? colors.warning : colors.primary) + "22" }]}>
        <Feather
          name={file.type === "folder" ? "folder" : "file-text"}
          size={16}
          color={file.type === "folder" ? colors.warning : colors.primary}
        />
      </View>
      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>{file.name}</Text>
        <Text style={[styles.fileSub, { color: colors.mutedForeground }]}>
          {file.type === "folder" ? "Folder" : formatSize(file.size)} · {new Date(file.lastModified).toLocaleDateString()}
        </Text>
      </View>
      <Feather name="more-vertical" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

function BotFileSection({ bot }: { bot: Bot }) {
  const colors = useColors();
  const { addFile } = useBots();
  const [expanded, setExpanded] = useState(false);
  const totalSize = bot.files.reduce((s, f) => s + f.size, 0);

  const handleUpload = () => {
    const names = ["index.js", "config.json", "utils.js", "commands.js", "events.js"];
    const name = names[Math.floor(Math.random() * names.length)];
    addFile(bot.id, {
      name,
      path: `/${name}`,
      size: Math.floor(Math.random() * 51200) + 512,
      type: "file",
      lastModified: new Date().toISOString(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => setExpanded((x) => !x)}>
        <View style={[styles.botAvatar, { backgroundColor: colors.primary + "22" }]}>
          <Feather name="cpu" size={15} color={colors.primary} />
        </View>
        <View style={styles.sectionInfo}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{bot.name}</Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
            {bot.files.length} files · {formatSize(totalSize)}
          </Text>
        </View>
        <View style={styles.sectionActions}>
          {expanded && (
            <>
              <TouchableOpacity onPress={handleUpload} style={[styles.iconBtn, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="upload" size={14} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNewFolder} style={[styles.iconBtn, { backgroundColor: colors.warning + "22" }]}>
                <Feather name="folder-plus" size={14} color={colors.warning} />
              </TouchableOpacity>
            </>
          )}
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>
      {expanded && (
        <View>
          {bot.files.length === 0 ? (
            <TouchableOpacity style={styles.uploadPrompt} onPress={handleUpload}>
              <Feather name="upload-cloud" size={24} color={colors.mutedForeground} />
              <Text style={[styles.uploadText, { color: colors.mutedForeground }]}>Upload files</Text>
            </TouchableOpacity>
          ) : (
            bot.files.map((f) => <FileRow key={f.id} file={f} botId={bot.id} colors={colors} />)
          )}
          <View style={[styles.storageBar, { backgroundColor: colors.surface }]}>
            <View style={styles.storageInfo}>
              <Feather name="hard-drive" size={12} color={colors.mutedForeground} />
              <Text style={[styles.storageText, { color: colors.mutedForeground }]}>
                {formatSize(totalSize)} / {formatSize(bot.storageMb * 1048576)} used
              </Text>
            </View>
            <View style={[styles.storageTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.storageFill,
                  {
                    width: `${Math.min(100, (totalSize / (bot.storageMb * 1048576)) * 100)}%` as any,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      )}
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
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>File Manager</Text>
      </View>
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16 }]}>
        <Feather name="search" size={15} color={colors.mutedForeground} />
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
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12 },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  searchBar: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, gap: 8, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  section: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  botAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionInfo: { flex: 1 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sectionSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  iconBtn: { width: 28, height: 28, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  fileRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  fileIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  fileSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  uploadPrompt: { alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 24 },
  uploadText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  storageBar: { padding: 10, gap: 6 },
  storageInfo: { flexDirection: "row", alignItems: "center", gap: 5 },
  storageText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  storageTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  storageFill: { height: "100%", borderRadius: 2 },
  empty: { alignItems: "center", gap: 8, paddingTop: 80 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  surface: {},
});
