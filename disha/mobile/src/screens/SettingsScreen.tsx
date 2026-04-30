import React from "react";
import { Text } from "react-native";

import { Panel } from "../components/Panel";
import { colors } from "../theme";

export function SettingsScreen() {
  return (
    <Panel title="Settings">
      <Text style={{ color: colors.muted }}>
        Device trust, token management, memory controls, and notification routing will live here.
      </Text>
    </Panel>
  );
}
