import React from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";

import { AlertsScreen } from "./screens/AlertsScreen";
import { ChatScreen } from "./screens/ChatScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { colors, spacing, type } from "./theme";

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View>
          <Text style={{ color: colors.text, fontSize: type.hero, fontWeight: "700" }}>JARVIS-X Mobile</Text>
          <Text style={{ color: colors.muted, marginTop: 8 }}>
            Chat, voice, alerts, and device risk visibility for the personal AI security assistant.
          </Text>
        </View>
        <ChatScreen />
        <DashboardScreen />
        <AlertsScreen />
        <SettingsScreen />
      </ScrollView>
    </SafeAreaView>
  );
}
