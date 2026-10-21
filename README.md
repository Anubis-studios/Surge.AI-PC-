# Open Agent OS — Phase 1

A production-grade, secure unified AI workspace featuring **MiniMax M2.7** as the preferred default model, live provider integrations, strict server-enforced Free-Only routing, capability-aware fallback, and full preservation of the Visual Computer desktop environment.

---

## 1. Key Architectural Features

1. **MiniMax M2.7 Default Preference**:
   - `minimax/minimax-m2.7` is selected by default for all new chat sessions.
   - Live endpoint and pricing validation: MiniMax M2.7 on OpenRouter is verified as a paid endpoint (`$0.30/M` input, `$1.20/M` output). Under the default Free-Only policy, paid inference is blocked, and requests safely route to verified zero-cost alternatives without silently altering the user's preferred model selection.

2. **Strict Server-Enforced Free-Only Routing**:
   - `freeOnly = true` is enforced on the server before dispatching any network request.
   - Endpoints are categorized into: `verified_free`, `free_with_limits`, `promotional_credit`, `paid`, `unknown`, `unavailable`.
   - Rejects unknown pricing, paid models, and promotional credits.
   - Transparent fallback metadata reports requested model vs. actual serving model, provider, latency, token usage, and zero estimated cost.

3. **Real Provider Integrations**:
   - **OpenRouter**: Live catalog discovery from `/api/v1/models`, pricing verification, and free model routing.
   - **Google Gemini**: Official `@google/genai` integration with `gemini-3.8-flash` in the free developer tier.
   - **Groq LPU**: Ultra-fast LPU inference (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`).
   - **Cerebras**: Wafer-scale inference (`llama3.1-8b`, `llama-3.3-70b`).
   - **Cloudflare Workers AI**: Edge inference with 10k free daily neurons (`@cf/meta/llama-3.1-8b-instruct`).
   - **GitHub Models**: Azure AI-powered developer preview tier.
   - **Hugging Face**: Serverless community inference API.
   - **Ollama**: 100% free offline local inference (`http://localhost:11434`).
   - **Generic OpenAI-Compatible**: Configurable base URL with SSRF protection blocking cloud metadata (169.254.169.254) and private subnets.

4. **Secure Credential Vault**:
   - API keys are stored exclusively in server-side storage and never exposed in browser bundles, DOM, or client-side responses.
   - Input masking and redacting in all logging and API endpoints.

5. **Unified Chat & Preserved Visual Computer**:
   - Streaming Markdown responses with code block copy buttons.
   - Response metadata drawer displaying latency, token usage, and fallback justification.
   - One-click navigation between Unified AI Chat Workspace and the interactive Visual Computer Desktop (Mail, Slides, Notepad, Snake game, Folder view, and InkLayer gesture recognition).

---

## 2. Installation & Quick Start

### Prerequisites
- Node.js >= 22.0.0
- npm >= 10.0.0

### Development
```bash
# Install dependencies
npm install

# Run full-stack dev server (Express backend + Vite frontend middleware on port 3000)
npm run dev
```

The application is hosted at: `http://localhost:3000`

### Running Automated Tests
```bash
# Execute Vitest test suite covering routing, default model, free-only security, and SSRF
npm test
```

### Production Build & Deployment
```bash
# Build frontend assets into dist/
npm run build

# Start full-stack server
npm run start
```

---

## 3. Environment Variables (.env)

Provider credentials can be supplied via environment variables or configured in the UI Settings panel (which saves them securely in server storage):

```ini
# Gemini API Key (Injected automatically in Google AI Studio)
GEMINI_API_KEY=

# OpenRouter API Key (For MiniMax and 300+ router models)
OPENROUTER_API_KEY=

# Groq API Key
GROQ_API_KEY=

# Cerebras API Key
CEREBRAS_API_KEY=

# Cloudflare Workers AI
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=

# GitHub Models
GITHUB_TOKEN=

# Hugging Face
HUGGINGFACE_API_KEY=

# Local Ollama URL
OLLAMA_BASE_URL=http://localhost:11434

# Server Port
PORT=3000
```

---

## 4. Provider Implementation & Verification Status

| Provider | Adapter Status | Live API Verified | Free-Tier Status |
| :--- | :--- | :--- | :--- |
| **OpenRouter** | Implemented | Verified (Live catalog discovery tested) | Verified Free models available (`:free` endpoints) |
| **Google Gemini** | Implemented | Verified (Real inference tested with Gemini 3.8 Flash) | Free with limits (15 RPM / 1500 RPD) |
| **Groq LPU** | Implemented | Tested (Credentials & models endpoint validated) | Developer free tier with token limits |
| **Cerebras** | Implemented | Tested | Free developer tier (30 RPM) |
| **Cloudflare Workers AI** | Implemented | Tested | 10k free neurons/day |
| **GitHub Models** | Implemented | Tested | Free preview access via GitHub PAT |
| **Hugging Face** | Implemented | Tested | Free community tier |
| **Ollama Local** | Implemented | Ready for local daemon | 100% Free offline local inference |
| **Custom OpenAI** | Implemented | Tested (SSRF protection enforced) | Configurable by endpoint |

---

## 5. Automated Test Coverage

The test suite in `/tests` verifies:
1. `minimax/minimax-m2.7` is the default model preference for new sessions.
2. User model preferences persist across requests and failures.
3. Server-side rejection of paid endpoints when fallback is disabled.
4. Transparent fallback decision and metadata generation.
5. SSRF protection rejecting cloud metadata (169.254.169.254) and private IP ranges.
6. Server-side credential isolation and storage integrity.
