"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { getModelOptions } from "@/lib/constants";
import { SettingRow, SectionHeader, Slider } from "./SettingRow";
import { cn } from "@/lib/utils";

export function ModelSettings() {
  const { settings, updateSettings, resetSettings } = useChatStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const modelOptions = getModelOptions(settings.provider);
  const selectedModel = modelOptions.find((model) => model.id === settings.model);

  return (
    <div>
      <SectionHeader title="Model" onReset={() => resetSettings("model")} />

      <SettingRow
        label="Default model"
        description="The AI model used for new conversations. Options change with the selected provider."
      >
        <select
          value={settings.model}
          onChange={(event) => updateSettings({ model: event.target.value })}
          aria-label="Default model"
          className={cn(
            "bg-surface-800 border border-surface-700 rounded-md px-3 py-1.5 text-sm",
            "text-surface-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          )}
        >
          {modelOptions.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label} - {model.description}
            </option>
          ))}
        </select>
      </SettingRow>

      {selectedModel && (
        <div className="mb-4 rounded-md border border-surface-800 bg-surface-800/50 px-3 py-2 text-xs text-surface-400">
          <span className="font-medium text-surface-300">{selectedModel.label}</span>
          {" - "}
          {selectedModel.description}
        </div>
      )}

      <SettingRow
        label="Max tokens"
        description="Maximum number of tokens in the model response."
        stack
      >
        <div className="flex items-center gap-3">
          <Slider
            value={settings.maxTokens}
            min={1000}
            max={200000}
            step={1000}
            onChange={(value) => updateSettings({ maxTokens: value })}
            showValue={false}
            className="flex-1"
          />
          <input
            type="number"
            value={settings.maxTokens}
            min={1000}
            max={200000}
            step={1000}
            onChange={(event) => updateSettings({ maxTokens: Number(event.target.value) })}
            aria-label="Max tokens"
            className={cn(
              "w-24 bg-surface-800 border border-surface-700 rounded-md px-2 py-1 text-right text-sm",
              "text-surface-200 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
            )}
          />
        </div>
      </SettingRow>

      <SettingRow
        label="System prompt"
        description="Custom instructions prepended to every conversation."
        stack
      >
        <textarea
          value={settings.systemPrompt}
          onChange={(event) => updateSettings({ systemPrompt: event.target.value })}
          placeholder="You are a helpful assistant..."
          rows={4}
          aria-label="System prompt"
          className={cn(
            "w-full resize-none rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm",
            "text-surface-200 placeholder-surface-600 focus:outline-none focus:ring-1 focus:ring-brand-500",
            "font-mono"
          )}
        />
      </SettingRow>

      <button
        onClick={() => setShowAdvanced((value) => !value)}
        type="button"
        className="mt-2 mb-1 flex items-center gap-1.5 text-xs text-surface-400 transition-colors hover:text-surface-200"
      >
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", showAdvanced && "rotate-180")}
        />
        Advanced settings
      </button>

      {showAdvanced && (
        <SettingRow
          label="Temperature"
          description="Controls response randomness. Higher values produce more varied output."
          stack
        >
          <Slider
            value={settings.temperature}
            min={0}
            max={1}
            step={0.05}
            onChange={(value) => updateSettings({ temperature: value })}
          />
        </SettingRow>
      )}
    </div>
  );
}
