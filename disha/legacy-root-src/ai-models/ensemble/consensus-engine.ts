import type { EnsembleResult, ModelResponse, VoteResult } from '../types.js'

export class ConsensusEngine {
  findConsensus(responses: ModelResponse[]): Omit<EnsembleResult, 'strategy'> {
    if (responses.length === 0) throw new Error('No responses to find consensus in')

    const scored = responses.map(r => ({
      response: r,
      similarity: this.averageSimilarity(r, responses),
    }))

    scored.sort((a, b) => {
      const simDiff = b.similarity - a.similarity
      if (Math.abs(simDiff) > 0.05) return simDiff
      return b.response.confidence - a.response.confidence
    })

    const best = scored[0]
    const confidence = best.similarity * best.response.confidence

    const votes: VoteResult[] = scored.map(s => ({
      answer: s.response.text.slice(0, 100),
      count: 1,
      percentage: s.similarity * 100,
    }))

    return {
      answer: best.response.text,
      confidence,
      all_results: responses,
      reasoning: `Consensus: most similar to other responses (similarity=${best.similarity.toFixed(2)})`,
      votes,
    }
  }

  computeSimilarity(a: string, b: string): number {
    const setA = new Set(this.tokenize(a))
    const setB = new Set(this.tokenize(b))

    if (setA.size === 0 && setB.size === 0) return 1
    if (setA.size === 0 || setB.size === 0) return 0

    let intersection = 0
    for (const token of setA) {
      if (setB.has(token)) intersection++
    }

    const union = setA.size + setB.size - intersection
    return intersection / union
  }

  private averageSimilarity(response: ModelResponse, all: ModelResponse[]): number {
    const others = all.filter(r => r !== response)
    if (others.length === 0) return 1

    const total = others.reduce(
      (sum, other) => sum + this.computeSimilarity(response.text, other.text),
      0,
    )
    return total / others.length
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0)
  }
}
