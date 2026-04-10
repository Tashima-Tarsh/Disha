import type { ModelRegion } from '../types.js'

export interface PerformanceTargets {
  latency: LatencyTargets
  quality: QualityTargets
  availability: AvailabilityTargets
  throughput: ThroughputTargets
  regionTargets: Record<ModelRegion, RegionPerformanceTarget>
}

export interface LatencyTargets {
  p50Ms: number
  p95Ms: number
  p99Ms: number
  maxMs: number
}

export interface QualityTargets {
  minQualityScore: number
  minSuccessRate: number
  minSatisfactionScore: number
}

export interface AvailabilityTargets {
  uptimePercentage: number
  maxDowntimeMs: number
}

export interface ThroughputTargets {
  minRequestsPerSecond: number
  minTokensPerSecond: number
}

export interface RegionPerformanceTarget {
  latencyMultiplier: number
  qualityFloor: number
}

export const performanceTargets: PerformanceTargets = {
  latency: {
    p50Ms: 500,
    p95Ms: 2000,
    p99Ms: 5000,
    maxMs: 30000,
  },
  quality: {
    minQualityScore: 0.7,
    minSuccessRate: 0.95,
    minSatisfactionScore: 0.75,
  },
  availability: {
    uptimePercentage: 99.9,
    maxDowntimeMs: 8 * 60 * 60 * 1000,
  },
  throughput: {
    minRequestsPerSecond: 10,
    minTokensPerSecond: 100,
  },
  regionTargets: {
    chinese: { latencyMultiplier: 1.0, qualityFloor: 0.75 },
    russian: { latencyMultiplier: 1.2, qualityFloor: 0.70 },
    western: { latencyMultiplier: 1.0, qualityFloor: 0.75 },
    japanese: { latencyMultiplier: 1.1, qualityFloor: 0.70 },
    indian: { latencyMultiplier: 1.3, qualityFloor: 0.65 },
  },
}
