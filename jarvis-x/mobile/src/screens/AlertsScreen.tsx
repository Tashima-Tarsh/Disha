import React from "react";
import { Text, View } from "react-native";

import { Panel } from "../components/Panel";
import { colors, spacing } from "../theme";

export function AlertsScreen() {
  return (
    <Panel title="Alerts">
      <View style={{ gap: spacing.md }}>
        <AlertRow title="CPU spike detected" detail="Desktop agent reported sustained CPU above baseline." />
        <AlertRow title="Network anomaly" detail="Outbound transfer volume exceeded recent average." />
      </View>
    </Panel>
  );
}

function AlertRow({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={{ borderRadius: 14, backgroundColor: "#0F172A", padding: spacing.md }}>
      <Text style={{ color: colors.text, fontWeight: "700" }}>{title}</Text>
      <Text style={{ color: colors.muted, marginTop: 6 }}>{detail}</Text>
    </View>
  );
}
