import React from "react";
import { Text, View } from "react-native";

import { Panel } from "../components/Panel";
import { colors, spacing } from "../theme";

export function DashboardScreen() {
  return (
    <Panel title="Security Dashboard">
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Metric label="Risk" value="LOW" tone={colors.secondary} />
        <Metric label="CPU" value="23%" tone={colors.accent} />
        <Metric label="Memory" value="54%" tone={colors.primary} />
      </View>
    </Panel>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 16,
        backgroundColor: "#0F172A",
        borderWidth: 1,
        borderColor: "#2B3750",
        padding: spacing.md
      }}
    >
      <Text style={{ color: colors.muted }}>{label}</Text>
      <Text style={{ color: tone, fontSize: 22, fontWeight: "700", marginTop: 8 }}>{value}</Text>
    </View>
  );
}
