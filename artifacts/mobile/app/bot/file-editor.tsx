import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
import { useBots } from "@/context/BotsContext";
import { useColors } from "@/hooks/useColors";

const DEFAULT_CONTENTS: Record<string, string> = {
  "index.js": `const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(\`Logged in as \${client.user.tag}\`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  if (message.content === '!ping') {
    message.reply('Pong! 🏓');
  }
});

client.login(process.env.DISCORD_TOKEN);
`,
  "package.json": `{
  "name": "discord-bot",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "discord.js": "^14.14.1",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
`,
  "config.json": `{
  "prefix": "!",
  "ownerId": "YOUR_DISCORD_USER_ID",
  "clientId": "YOUR_BOT_CLIENT_ID",
  "guildId": "YOUR_SERVER_ID",
  "color": "#5865F2",
  "maxWarnings": 3,
  "muteRole": "Muted",
  "logChannel": "bot-logs"
}
`,
  "bot.js": `const { Client, Events, GatewayIntentBits } = require('discord.js');
const config = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on(Events.ClientReady, (c) => {
  console.log(\`Ready! Logged in as \${c.user.tag}\`);
});

client.login(process.env.DISCORD_TOKEN);
`,
  "main.py": `import discord
import os
from discord.ext import commands

intents = discord.Intents.default()
intents.message_content = True

bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'Logged in as {bot.user} (ID: {bot.user.id})')

@bot.command()
async def ping(ctx):
    await ctx.send(f'Pong! Latency: {round(bot.latency * 1000)}ms')

bot.run(os.environ['DISCORD_TOKEN'])
`,
  "requirements.txt": `discord.py>=2.3.2
python-dotenv>=1.0.0
aiohttp>=3.9.0
`,
};

function getDefaultContent(fileName: string): string {
  if (DEFAULT_CONTENTS[fileName]) return DEFAULT_CONTENTS[fileName];
  const ext = fileName.split(".").pop() ?? "";
  if (ext === "js") return `// ${fileName}\n\nconsole.log('Hello from ${fileName}');\n`;
  if (ext === "py") return `# ${fileName}\n\nprint('Hello from ${fileName}')\n`;
  if (ext === "json") return `{\n  \n}\n`;
  if (ext === "md") return `# ${fileName.replace(".md", "")}\n\nDocumentation goes here.\n`;
  if (ext === "env" || fileName === ".env") return `# Environment Variables\nDISCORD_TOKEN=your_token_here\n`;
  if (ext === "txt") return ``;
  return `// ${fileName}\n`;
}

function getLanguageColor(fileName: string, colors: ReturnType<typeof useColors>) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    js: "#f7df1e",
    ts: "#3178c6",
    py: "#3776ab",
    json: colors.warning,
    md: colors.mutedForeground,
    txt: colors.mutedForeground,
    env: colors.success,
    yml: colors.destructive,
    yaml: colors.destructive,
  };
  return map[ext] ?? colors.primary;
}

function getLanguageLabel(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    js: "JavaScript",
    ts: "TypeScript",
    py: "Python",
    json: "JSON",
    md: "Markdown",
    txt: "Text",
    env: "Env File",
    yml: "YAML",
    yaml: "YAML",
  };
  return map[ext] ?? "Plain Text";
}

function highlightLine(line: string, colors: ReturnType<typeof useColors>) {
  return line;
}

export default function FileEditorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { botId, fileId, fileName: fileNameParam } = useLocalSearchParams<{
    botId: string;
    fileId: string;
    fileName: string;
  }>();

  const { bots, updateBot } = useBots();
  const bot = bots.find((b) => b.id === botId);
  const file = bot?.files.find((f) => f.id === fileId);
  const fileName = fileNameParam ?? file?.name ?? "untitled.txt";

  const [content, setContent] = useState<string>(() => {
    return (file as any)?.content ?? getDefaultContent(fileName);
  });
  const [saved, setSaved] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [fontSize, setFontSize] = useState(13);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setSaved(false);
  }, [content]);

  const handleSave = () => {
    if (!bot || !file) return;
    const updatedFiles = bot.files.map((f) =>
      f.id === fileId ? { ...f, content, size: content.length } : f
    );
    updateBot(bot.id, { files: updatedFiles });
    setSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(content);
    Alert.alert("Copied", "File content copied to clipboard");
  };

  const handleDiscard = () => {
    if (!saved) {
      Alert.alert("Discard Changes", "You have unsaved changes. Discard them?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            setContent((file as any)?.content ?? getDefaultContent(fileName));
            setSaved(true);
          },
        },
      ]);
    } else {
      router.back();
    }
  };

  const lines = content.split("\n");
  const langColor = getLanguageColor(fileName, colors);
  const langLabel = getLanguageLabel(fileName);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: "#0a0c0f" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleDiscard} style={styles.headerBtn}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.fileNameRow}>
            <View style={[styles.langDot, { backgroundColor: langColor }]} />
            <Text style={[styles.headerFileName, { color: colors.foreground }]} numberOfLines={1}>{fileName}</Text>
            {!saved && <View style={[styles.unsavedDot, { backgroundColor: colors.warning }]} />}
          </View>
          <View style={styles.headerMeta}>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {langLabel} · {lines.length} lines · {content.length} chars
            </Text>
            <Text style={[styles.headerBot, { color: colors.primary }]}>{bot?.name}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowLineNumbers((x) => !x)} style={styles.headerBtn}>
            <Feather name="hash" size={16} color={showLineNumbers ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCopy} style={styles.headerBtn}>
            <Feather name="copy" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveBtn, { backgroundColor: saved ? colors.surface : colors.primary }]}
            disabled={saved}
          >
            <Feather name="save" size={14} color={saved ? colors.mutedForeground : "#fff"} />
            <Text style={[styles.saveBtnText, { color: saved ? colors.mutedForeground : "#fff" }]}>
              {saved ? "Saved" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
          <TouchableOpacity onPress={() => setReadOnly((x) => !x)} style={[styles.toolChip, { backgroundColor: readOnly ? colors.warning + "22" : colors.surface }]}>
            <Feather name={readOnly ? "eye" : "edit-2"} size={12} color={readOnly ? colors.warning : colors.mutedForeground} />
            <Text style={[styles.toolChipText, { color: readOnly ? colors.warning : colors.mutedForeground }]}>
              {readOnly ? "Read-only" : "Editing"}
            </Text>
          </TouchableOpacity>
          {[10, 12, 13, 14, 16].map((size) => (
            <TouchableOpacity
              key={size}
              onPress={() => setFontSize(size)}
              style={[styles.toolChip, { backgroundColor: fontSize === size ? colors.primary + "22" : colors.surface }]}
            >
              <Text style={[styles.toolChipText, { color: fontSize === size ? colors.primary : colors.mutedForeground }]}>
                {size}px
              </Text>
            </TouchableOpacity>
          ))}
          <View style={[styles.toolChip, { backgroundColor: langColor + "22" }]}>
            <View style={[styles.langDot, { backgroundColor: langColor }]} />
            <Text style={[styles.toolChipText, { color: langColor }]}>{langLabel}</Text>
          </View>
        </ScrollView>
      </View>

      {/* Editor */}
      <View style={styles.editor}>
        {showLineNumbers ? (
          <View style={[styles.lineNumbers, { backgroundColor: "#0a0c0f", borderRightColor: colors.border }]}>
            <ScrollView scrollEnabled={false} showsVerticalScrollIndicator={false}>
              {lines.map((_, i) => (
                <Text key={i} style={[styles.lineNumber, { color: colors.mutedForeground, fontSize }]}>
                  {i + 1}
                </Text>
              ))}
            </ScrollView>
          </View>
        ) : null}
        <TextInput
          ref={inputRef}
          value={content}
          onChangeText={setContent}
          multiline
          editable={!readOnly}
          style={[
            styles.codeInput,
            {
              color: colors.foreground,
              fontSize,
              opacity: readOnly ? 0.7 : 1,
            },
          ]}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          textAlignVertical="top"
          scrollEnabled={true}
        />
      </View>

      {/* Status bar */}
      <View style={[styles.statusBar, { backgroundColor: colors.primary, paddingBottom: insets.bottom }]}>
        <Text style={styles.statusText}>{bot?.name} › {fileName}</Text>
        <Text style={styles.statusText}>{langLabel} · UTF-8 · LF</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  headerBtn: { padding: 6 },
  headerCenter: { flex: 1, gap: 2 },
  fileNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  langDot: { width: 8, height: 8, borderRadius: 4 },
  headerFileName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  unsavedDot: { width: 7, height: 7, borderRadius: 3.5 },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  headerBot: { fontSize: 11, fontFamily: "Inter_500Medium" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  saveBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  saveBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  toolbar: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  toolbarContent: { paddingHorizontal: 12, paddingVertical: 7, gap: 6 },
  toolChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  toolChipText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  editor: { flex: 1, flexDirection: "row" },
  lineNumbers: { width: 40, paddingTop: 12, paddingRight: 8, borderRightWidth: 1, alignItems: "flex-end" },
  lineNumber: { lineHeight: 22, fontFamily: "Inter_400Regular", paddingHorizontal: 4 },
  codeInput: {
    flex: 1,
    padding: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    textAlignVertical: "top",
  },
  statusBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 4 },
  statusText: { fontSize: 10, color: "#ffffff99", fontFamily: "Inter_400Regular" },
});
