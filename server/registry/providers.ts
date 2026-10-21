/**
 * Open Agent OS - Provider Registry & Metadata
 */
import { ProviderConfig, ProviderId } from '../types.js';

export const PROVIDER_METADATA: Record<ProviderId, Omit<ProviderConfig, 'status' | 'isConfigured' | 'hasEnvKey' | 'modelsCount' | 'lastHealthCheck'>> = {
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Unified router for 300+ AI models including MiniMax, Llama 3, Mistral, and Claude. Hosts verified :free models.',
    website: 'https://openrouter.ai',
    docUrl: 'https://openrouter.ai/docs',
    requiresKey: true,
    statusMessage: 'Ready for live model discovery and free-model routing.',
    freeTierPolicy: 'Free tier available for models with :free tag and zero token pricing. Requires an OpenRouter API key.',
    supportsStreaming: true,
    supportsModelDiscovery: true
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google DeepMind multimodal AI models with official developer API.',
    website: 'https://aistudio.google.com',
    docUrl: 'https://ai.google.dev/docs',
    requiresKey: true,
    statusMessage: 'Official Google Gemini provider via @google/genai SDK.',
    freeTierPolicy: 'Free tier with rate limits (15 RPM / 1M TPM / 1500 RPD) available in Google AI Studio.',
    supportsStreaming: true,
    supportsModelDiscovery: true
  },
  groq: {
    id: 'groq',
    name: 'Groq LPU',
    description: 'Ultra-low-latency LPU inference engine for open-weights models.',
    website: 'https://groq.com',
    docUrl: 'https://console.groq.com/docs',
    requiresKey: true,
    statusMessage: 'Ultra-fast inference on Llama 3.3, Llama 3.1, and Gemma 2.',
    freeTierPolicy: 'Developer free tier with hourly and daily token limits across supported open models.',
    supportsStreaming: true,
    supportsModelDiscovery: true
  },
  cerebras: {
    id: 'cerebras',
    name: 'Cerebras',
    description: 'Wafer-scale AI inference providing industry-leading throughput.',
    website: 'https://cerebras.ai',
    docUrl: 'https://inference-docs.cerebras.ai',
    requiresKey: true,
    statusMessage: 'High-speed inference for Llama 3.1 models.',
    freeTierPolicy: 'Free developer tier with rate limits (30 RPM / 60k TPM / 1M TPD).',
    supportsStreaming: true,
    supportsModelDiscovery: true
  },
  cloudflare: {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    description: 'Serverless GPU inference at the edge across global Cloudflare data centers.',
    website: 'https://workers.cloudflare.com',
    docUrl: 'https://developers.cloudflare.com/workers-ai',
    requiresKey: true,
    statusMessage: 'Edge inference with free daily neuron allotment.',
    freeTierPolicy: '10,000 free neurons per day on standard Cloudflare accounts.',
    supportsStreaming: true,
    supportsModelDiscovery: true
  },
  github: {
    id: 'github',
    name: 'GitHub Models',
    description: 'Playground and API for industry-leading models via Azure AI.',
    website: 'https://github.com/marketplace/models',
    docUrl: 'https://docs.github.com/en/github-models',
    requiresKey: true,
    statusMessage: 'Free preview access with personal access token for GitHub users.',
    freeTierPolicy: 'Free rate-limited preview tiers (15 RPM / 150 RPD) for GitHub developers.',
    supportsStreaming: true,
    supportsModelDiscovery: true
  },
  huggingface: {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Serverless Inference API on open weights hosted on Hugging Face Hub.',
    website: 'https://huggingface.co',
    docUrl: 'https://huggingface.co/docs/api-inference',
    requiresKey: true,
    statusMessage: 'Access to community open-source models via Serverless API.',
    freeTierPolicy: 'Community tier provides free inference on select warm models subject to shared compute availability.',
    supportsStreaming: true,
    supportsModelDiscovery: true
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Run open-weight models locally on your own hardware with zero cost and complete privacy.',
    website: 'https://ollama.com',
    docUrl: 'https://github.com/ollama/ollama',
    requiresKey: false,
    statusMessage: 'Local OpenAI-compatible inference server running on localhost:11434.',
    freeTierPolicy: '100% Free & Unlimited. Runs on local machine GPU/CPU without external API keys.',
    supportsStreaming: true,
    supportsModelDiscovery: true
  },
  custom_openai: {
    id: 'custom_openai',
    name: 'Custom OpenAI-Compatible',
    description: 'Connect to any OpenAI-compatible server (LM Studio, LocalAI, vLLM, or custom proxies).',
    website: 'https://platform.openai.com/docs/api-reference',
    docUrl: 'https://platform.openai.com/docs',
    requiresKey: false,
    statusMessage: 'Configurable base URL with SSRF protection.',
    freeTierPolicy: 'Depends on the target endpoint. Only zero-cost local/self-hosted endpoints are eligible in free-only mode.',
    supportsStreaming: true,
    supportsModelDiscovery: false
  }
};
