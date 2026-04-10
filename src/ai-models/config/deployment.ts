import type { ModelRegion } from '../types.js'

export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production'
  server: {
    host: string
    port: number
    workers: number
    timeout: number
  }
  storage: {
    basePath: string
    maxCacheSizeBytes: number
    backupEnabled: boolean
    backupIntervalMs: number
  }
  regions: Record<ModelRegion, RegionDeploymentConfig>
}

export interface RegionDeploymentConfig {
  enabled: boolean
  maxModels: number
  storageQuotaBytes: number
}

export const deploymentConfig: DeploymentConfig = {
  environment: (process.env.NODE_ENV as DeploymentConfig['environment']) ?? 'development',
  server: {
    host: process.env.AI_MODELS_HOST ?? '0.0.0.0',
    port: Number.parseInt(process.env.AI_MODELS_PORT ?? '8080', 10),
    workers: Number.parseInt(process.env.AI_MODELS_WORKERS ?? '4', 10),
    timeout: 30000,
  },
  storage: {
    basePath: process.env.AI_MODELS_STORAGE ?? './models',
    maxCacheSizeBytes: 100 * 1024 * 1024 * 1024, // 100 GB
    backupEnabled: false,
    backupIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  regions: {
    chinese: { enabled: true, maxModels: 200, storageQuotaBytes: 500 * 1024 * 1024 * 1024 },
    russian: { enabled: true, maxModels: 100, storageQuotaBytes: 200 * 1024 * 1024 * 1024 },
    western: { enabled: true, maxModels: 500, storageQuotaBytes: 1024 * 1024 * 1024 * 1024 },
    japanese: { enabled: true, maxModels: 80, storageQuotaBytes: 150 * 1024 * 1024 * 1024 },
    indian: { enabled: true, maxModels: 60, storageQuotaBytes: 100 * 1024 * 1024 * 1024 },
  },
}
