import type { ModelResponse } from '../types.js'

export class WeightCalculator {
  computeWeights(responses: ModelResponse[]): number[] {
    if (responses.length === 0) return []
    if (responses.length === 1) return [1]

    const rawWeights = responses.map(r => this.scoreResponse(r))
    const total = rawWeights.reduce((sum, w) => sum + w, 0)

    if (total === 0) {
      return responses.map(() => 1 / responses.length)
    }

    return rawWeights.map(w => w / total)
  }

  computeWeightsWithHistory(
    responses: ModelResponse[],
    historicalAccuracy: Map<string, number>,
  ): number[] {
    if (responses.length === 0) return []

    const rawWeights = responses.map(r => {
      const base = this.scoreResponse(r)
      const history = historicalAccuracy.get(r.modelId) ?? 0.5
      return base * (0.5 + history * 0.5)
    })

    const total = rawWeights.reduce((sum, w) => sum + w, 0)
    if (total === 0) return responses.map(() => 1 / responses.length)

    return rawWeights.map(w => w / total)
  }

  private scoreResponse(response: ModelResponse): number {
    const confidenceScore = response.confidence
    const latencyPenalty = Math.max(0, 1 - response.executionTime / 10000)
    const lengthBonus = Math.min(0.2, response.tokens / 1000)
    return Math.max(0.01, confidenceScore * 0.7 + latencyPenalty * 0.2 + lengthBonus * 0.1)
  }
}
