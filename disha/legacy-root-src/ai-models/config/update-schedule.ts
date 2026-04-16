import type { ScheduledUpdate } from '../types.js'

export interface UpdateScheduleConfig {
  checkIntervalMs: number
  batchSize: number
  maxConcurrentDownloads: number
  retryAttempts: number
  retryDelayMs: number
  priorities: {
    high: string[]
    normal: string[]
    low: string[]
  }
  maintenanceWindow: {
    startHour: number
    endHour: number
    timezone: string
  }
}

export const updateScheduleConfig: UpdateScheduleConfig = {
  checkIntervalMs: 6 * 60 * 60 * 1000, // 6 hours
  batchSize: 10,
  maxConcurrentDownloads: 3,
  retryAttempts: 3,
  retryDelayMs: 30000,
  priorities: {
    high: ['deepseek-r1', 'qwen3-72b', 'llama-4-maverick-17b'],
    normal: ['mistral-large-2411', 'phi-4', 'gemma-3-27b-it'],
    low: ['bloom-7b1', 'rugpt3-large', 'xglm-7.5b'],
  },
  maintenanceWindow: {
    startHour: 2,
    endHour: 6,
    timezone: 'UTC',
  },
}

export function createScheduledUpdate(
  modelId: string,
  priority: ScheduledUpdate['priority'] = 'normal',
): ScheduledUpdate {
  return {
    modelId,
    scheduledAt: new Date(),
    priority,
    status: 'pending',
  }
}
