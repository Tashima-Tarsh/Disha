import type { EnsembleResult, ModelResponse, VoteResult, VotingStrategy } from '../types.js'
import { ConsensusEngine } from './consensus-engine.js'
import { WeightCalculator } from './weight-calculator.js'

export class EnsembleVoting {
  private consensus: ConsensusEngine
  private calculator: WeightCalculator

  constructor() {
    this.consensus = new ConsensusEngine()
    this.calculator = new WeightCalculator()
  }

  vote(responses: ModelResponse[], strategy: VotingStrategy = 'weighted'): EnsembleResult {
    if (responses.length === 0) {
      throw new Error('Cannot vote on empty response list')
    }
    if (responses.length === 1) {
      return this.singleResponse(responses[0], strategy)
    }

    switch (strategy) {
      case 'majority':
        return this.majorityVote(responses)
      case 'weighted':
        return this.weightedVote(responses)
      case 'consensus':
        return this.consensusVote(responses)
      default:
        return this.weightedVote(responses)
    }
  }

  private majorityVote(responses: ModelResponse[]): EnsembleResult {
    const groups = this.groupSimilar(responses)
    const sorted = Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
    const winner = sorted[0]
    const winnerResponses = winner[1]

    const votes: VoteResult[] = sorted.map(([answer, members]) => ({
      answer: answer.slice(0, 100),
      count: members.length,
      percentage: (members.length / responses.length) * 100,
    }))

    return {
      answer: winnerResponses[0].text,
      confidence: winnerResponses.length / responses.length,
      all_results: responses,
      reasoning: `Majority vote: ${winnerResponses.length}/${responses.length} models agreed`,
      votes,
      strategy: 'majority',
    }
  }

  private weightedVote(responses: ModelResponse[]): EnsembleResult {
    const weights = this.calculator.computeWeights(responses)
    let bestScore = -1
    let bestResponse = responses[0]

    for (let i = 0; i < responses.length; i++) {
      const score = (weights[i] ?? 0) * responses[i].confidence
      if (score > bestScore) {
        bestScore = score
        bestResponse = responses[i]
      }
    }

    const votes: VoteResult[] = responses.map((r, i) => ({
      answer: r.text.slice(0, 100),
      count: 1,
      percentage: ((weights[i] ?? 0) * 100),
    }))

    return {
      answer: bestResponse.text,
      confidence: bestScore,
      all_results: responses,
      reasoning: `Weighted vote: selected response with highest combined weight×confidence score`,
      votes,
      strategy: 'weighted',
    }
  }

  private consensusVote(responses: ModelResponse[]): EnsembleResult {
    const consensus = this.consensus.findConsensus(responses)
    return { ...consensus, strategy: 'consensus' }
  }

  private singleResponse(response: ModelResponse, strategy: VotingStrategy): EnsembleResult {
    return {
      answer: response.text,
      confidence: response.confidence,
      all_results: [response],
      reasoning: 'Single model response',
      votes: [{ answer: response.text.slice(0, 100), count: 1, percentage: 100 }],
      strategy,
    }
  }

  private groupSimilar(responses: ModelResponse[]): Record<string, ModelResponse[]> {
    const groups: Record<string, ModelResponse[]> = {}
    for (const r of responses) {
      const key = r.text.slice(0, 50).toLowerCase().replace(/\s+/g, ' ')
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    }
    return groups
  }
}
