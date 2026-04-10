import type { InvokeOptions } from '../types.js'

export interface AdaptedRequest {
  prompt: string
  temperature: number
  maxTokens: number
  systemPrompt?: string
  stopSequences: string[]
}

export class RequestAdapter {
  adapt(prompt: string, options: InvokeOptions = {}): AdaptedRequest {
    return {
      prompt: this.preprocessPrompt(prompt, options.language),
      temperature: this.resolveTemperature(options.temperature, options.budget),
      maxTokens: this.resolveMaxTokens(options.maxTokens),
      stopSequences: [],
    }
  }

  private preprocessPrompt(prompt: string, language?: string): string {
    let processed = prompt.trim()
    if (language && language !== 'en') {
      processed = `[Language: ${language}]\n${processed}`
    }
    return processed
  }

  private resolveTemperature(temperature?: number, budget?: string): number {
    if (temperature !== undefined) return Math.max(0, Math.min(2, temperature))
    switch (budget) {
      case 'best':
        return 0.2
      case 'balanced':
        return 0.7
      case 'cheap':
        return 1.0
      default:
        return 0.7
    }
  }

  private resolveMaxTokens(maxTokens?: number): number {
    if (maxTokens !== undefined && maxTokens > 0) return maxTokens
    return 2048
  }

  formatForProvider(
    request: AdaptedRequest,
    provider: 'openai' | 'anthropic' | 'huggingface',
  ): Record<string, unknown> {
    switch (provider) {
      case 'openai':
        return {
          messages: [{ role: 'user', content: request.prompt }],
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          stop: request.stopSequences.length > 0 ? request.stopSequences : undefined,
        }
      case 'anthropic':
        return {
          messages: [{ role: 'user', content: request.prompt }],
          temperature: request.temperature,
          max_tokens: request.maxTokens,
        }
      case 'huggingface':
        return {
          inputs: request.prompt,
          parameters: {
            temperature: request.temperature,
            max_new_tokens: request.maxTokens,
          },
        }
      default:
        return { prompt: request.prompt }
    }
  }
}
