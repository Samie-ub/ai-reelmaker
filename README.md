# ReelMaker

A local-first, responsive short-form video editor built with React, TypeScript, Remotion, and Vite. Choose a reusable 9:16 template, use a local Llama model or edit the creative direction manually, preview frame-accurately, save automatically, and export a real WebM video in the browser.

## Run locally

Requires Node.js 24+.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. The editor contains no remote runtime requests; projects are saved in `localStorage` under a versioned schema.

## Local AI creation

The editor can use `llama3.2:latest` through Ollama to generate safe, editable copy, color, alignment, and timing for the selected motion template. Remotion remains the renderer; model output is constrained to a JSON schema and validated before it reaches project state.

```bash
ollama pull llama3.2
ollama serve
```

Keep Ollama running, start ReelMaker with `npm run dev`, then use **AI create** in the properties panel. The request goes directly from the browser to `http://127.0.0.1:11434`; prompts and generated content remain on the local machine. Ollama allows local browser origins by default. If ReelMaker is served from a non-local origin, configure that origin with Ollama's `OLLAMA_ORIGINS` setting.

## Verify

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit --audit-level=moderate
```

## Production container

The included multi-stage `Dockerfile` serves the immutable build from unprivileged nginx on port 8080, adds SPA routing and security headers, and exposes `/healthz`.

```bash
docker build -t reelmaker .
docker run --rm -p 8080:8080 reelmaker
```

The current exporter produces WebM locally through `MediaRecorder`. See [docs/PRODUCT.md](docs/PRODUCT.md) for the server-rendered Remotion MP4 upgrade path, security boundaries, scope, and acceptance criteria.
