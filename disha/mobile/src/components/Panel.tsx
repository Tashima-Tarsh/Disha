import React, { PropsWithChildren } from "react";
import { Text, View } from "react-native";

import { colors, spacing, type } from "../theme";

export function Panel({ children, title }: PropsWithChildren<{ title: string }>) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 18,
        padding: spacing.lg,
        gap: spacing.md
      }}
    >
      <Text style={{ color: colors.text, fontSize: type.title, fontWeight: "700" }}>{title}</Text>
      {children}
    </View>
  );
}
