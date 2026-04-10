export type ModelRegion = 'chinese' | 'russian' | 'western' | 'japanese' | 'indian'
export type ModelCapability =
  | 'text'
  | 'code'
  | 'vision'
  | 'math'
  | 'reasoning'
  | 'multilingual'
  | 'speech'
  | 'image-generation'
export type ModelStatus = 'available' | 'loaded' | 'downloading' | 'error' | 'deprecated'
export type VotingStrategy = 'majority' | 'weighted' | 'consensus'
export type BudgetLevel = 'cheap' | 'balanced' | 'best'
export type QuantizationType = '4bit' | '8bit' | 'none'

export interface ModelPerformance {
  averageLatency: number
  qualityScore: number
  successRate: number
  throughput: number
}

export interface Model {
  id: string
  name: string
  region: ModelRegion
  category: string
  size: number
  contextWindow: number
  capabilities: ModelCapability[]
  sourceUrl: string
  downloadCount: number
  lastUpdated: Date
  status: ModelStatus
  path?: string
  performance: ModelPerformance
  weights: number
  license: string
  version: string
  parameters: string
  quantization: QuantizationType
}

export interface ModelVersion {
  id: string
  modelId: string
  versionNumber: string
  releaseDate: Date
  changeLog: string
  downloadCount: number
  status: 'active' | 'deprecated' | 'archived'
  active: boolean
}

export interface ModelResponse {
  text: string
  modelId: string
  executionTime: number
  confidence: number
  tokens: number
}

export interface VoteResult {
  answer: string
  count: number
  percentage: number
}

export interface EnsembleResult {
  answer: string
  confidence: number
  all_results: ModelResponse[]
  reasoning: string
  votes: VoteResult[]
  strategy: VotingStrategy
}

export interface ModelStats {
  modelId: string
  totalInferences: number
  totalTime: number
  averageTime: number
  lastUsed: Date
  queryTypes: Set<string>
  satisfactionScore: number
  qualityScores: number[]
  averageQuality: number
}

export interface InvokeOptions {
  modelId?: string
  category?: string
  region?: ModelRegion
  language?: string
  budget?: BudgetLevel
  timeout?: number
  temperature?: number
  maxTokens?: number
}

export interface EnsembleOptions {
  region?: ModelRegion
  category?: string
  diversityFactor?: number
}

export interface UpdateInfo {
  modelId: string
  currentVersion: string
  latestVersion: string
  changeLog: string
  size: number
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical'
  loadedModels: number
  availableMemory: number
  cpuUsage: number
  requestsPerSecond: number
}

export interface CacheEntry<T> {
  key: string
  value: T
  createdAt: Date
  expiresAt: Date
  hits: number
}

export interface MetricPoint {
  timestamp: Date
  value: number
  labels: Record<string, string>
}

export interface BenchmarkResult {
  modelId: string
  taskType: string
  score: number
  latencyMs: number
  tokensPerSecond: number
  timestamp: Date
}

export interface LeaderboardEntry {
  rank: number
  modelId: string
  modelName: string
  score: number
  region: ModelRegion
  category: string
  benchmarkResults: BenchmarkResult[]
}

export interface ScheduledUpdate {
  modelId: string
  scheduledAt: Date
  priority: 'low' | 'normal' | 'high'
  status: 'pending' | 'running' | 'completed' | 'failed'
}

export interface StorageOptions {
  basePath: string
  maxSizeBytes: number
  compression: boolean
}

export interface RateLimitConfig {
  requestsPerMinute: number
  requestsPerHour: number
  burstLimit: number
}

export interface LoadBalancerConfig {
  strategy: 'round-robin' | 'least-connections' | 'weighted'
  healthCheckIntervalMs: number
}
