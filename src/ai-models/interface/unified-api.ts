import type {
  BudgetLevel,
  EnsembleOptions,
  EnsembleResult,
  InvokeOptions,
  Model,
  ModelResponse,
} from '../types.js'
import { ModelRegistry } from '../registry/model-registry.js'
import { ModelLoader } from '../registry/model-loader.js'
import { ModelRouter } from './model-router.js'
import { RequestAdapter } from './request-adapter.js'
import { ResponseNormalizer } from './response-normalizer.js'
import { EnsembleVoting } from '../ensemble/ensemble-voting.js'

export class UnifiedModelAPI {
  private registry: ModelRegistry
  private loader: ModelLoader
  private router: ModelRouter
  private adapter: RequestAdapter
  private normalizer: ResponseNormalizer
  private voting: EnsembleVoting

  constructor() {
    this.registry = ModelRegistry.getInstance()
    this.loader = new ModelLoader(this.registry)
    this.router = new ModelRouter(this.registry)
    this.adapter = new RequestAdapter()
    this.normalizer = new ResponseNormalizer()
    this.voting = new EnsembleVoting()
  }

  async invoke(prompt: string, options: InvokeOptions = {}): Promise<ModelResponse> {
    const model = this.selectModel(options)
    if (!model) {
      throw new Error('No suitable model found for the given options')
    }

    await this.ensureLoaded(model.id)

    const adapted = this.adapter.adapt(prompt, options)
    const start = Date.now()

    const raw = await this.generateStub(model, adapted.prompt, adapted.temperature, adapted.maxTokens)

    const response = this.normalizer.normalize(raw, model.id, Date.now() - start)
    return response
  }

  async ensemble(prompt: string, options: EnsembleOptions = {}): Promise<EnsembleResult> {
    const models = this.router.selectEnsemble(options)

    const responses = await Promise.allSettled(
      models.map(m =>
        this.invoke(prompt, { modelId: m.id }).catch(
          (): ModelResponse => ({
            text: '',
            modelId: m.id,
            executionTime: 0,
            confidence: 0,
            tokens: 0,
          }),
        ),
      ),
    )

    const successful = responses
      .filter((r): r is PromiseFulfilledResult<ModelResponse> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter(r => r.text.length > 0)

    if (successful.length === 0) {
      throw new Error('All ensemble models failed')
    }

    return this.voting.vote(successful, 'weighted')
  }

  private selectModel(options: InvokeOptions): Model | undefined {
    if (options.modelId) {
      return this.registry.getById(options.modelId)
    }
    return this.router.selectBest(options)
  }

  private async ensureLoaded(modelId: string): Promise<void> {
    const model = this.registry.getById(modelId)
    if (model && model.status !== 'loaded') {
      await this.loader.load(modelId)
    }
  }

  private async generateStub(
    model: Model,
    prompt: string,
    temperature: number,
    maxTokens: number,
  ): Promise<string> {
    // Stub generation - real impl would call the loaded model
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 50))
    const _used = { temperature, maxTokens }
    return `[${model.name}] Response to: "${prompt.slice(0, 60)}${prompt.length > 60 ? '...' : ''}"`
  }

  private selectBudgetModels(_budget: BudgetLevel, _count: number): Model[] {
    return this.registry.sortByWeight().slice(0, _count)
  }
}
