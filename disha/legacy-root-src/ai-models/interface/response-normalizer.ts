import type { ModelResponse } from '../types.js'

export class ResponseNormalizer {
  normalize(raw: string, modelId: string, executionTimeMs: number): ModelResponse {
    const text = this.cleanText(raw)
    const tokens = this.estimateTokens(text)
    const confidence = this.estimateConfidence(text)

    return {
      text,
      modelId,
      executionTime: executionTimeMs,
      confidence,
      tokens,
    }
  }

  normalizeFromProviderResponse(
    response: Record<string, unknown>,
    modelId: string,
    executionTimeMs: number,
    provider: 'openai' | 'anthropic' | 'huggingface',
  ): ModelResponse {
    let text = ''

    switch (provider) {
      case 'openai': {
        const choices = response.choices as Array<{ message?: { content?: string }; text?: string }> | undefined
        text = choices?.[0]?.message?.content ?? choices?.[0]?.text ?? ''
        break
      }
      case 'anthropic': {
        const content = response.content as Array<{ text?: string }> | undefined
        text = content?.[0]?.text ?? ''
        break
      }
      case 'huggingface': {
        const generated = response.generated_text as string | undefined
        text = generated ?? (Array.isArray(response) ? (response[0] as { generated_text?: string })?.generated_text ?? '' : '')
        break
      }
    }

    return this.normalize(text, modelId, executionTimeMs)
  }

  mergeResponses(responses: ModelResponse[]): ModelResponse {
    if (responses.length === 0) {
      throw new Error('Cannot merge empty responses')
    }
    if (responses.length === 1) return responses[0]

    const combined = responses.map(r => r.text).join('\n\n---\n\n')
    const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length
    const totalTokens = responses.reduce((sum, r) => sum + r.tokens, 0)
    const maxTime = Math.max(...responses.map(r => r.executionTime))

    return {
      text: combined,
      modelId: responses.map(r => r.modelId).join(','),
      executionTime: maxTime,
      confidence: avgConfidence,
      tokens: totalTokens,
    }
  }

  private cleanText(text: string): string {
    return text.trim().replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n')
  }

  private estimateTokens(text: string): number {
    // Rough estimate: ~4 chars per token
    return Math.ceil(text.length / 4)
  }

  private estimateConfidence(text: string): number {
    if (text.length === 0) return 0
    if (text.length < 10) return 0.3
    if (text.length < 50) return 0.6
    return 0.85
  }
}
