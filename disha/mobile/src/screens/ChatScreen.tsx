import React from "react";
import { Text } from "react-native";

import { Panel } from "../components/Panel";
import { colors } from "../theme";

export function ChatScreen() {
  return (
    <Panel title="Chat + Voice Input">
      <Text style={{ color: colors.muted }}>
        Conversational assistant surface with planned microphone trigger, command suggestions, and execution confirmations.
      </Text>
    </Panel>
  );
}
