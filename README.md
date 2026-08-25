# ReelMaker

A local-first, responsive short-form video editor built with React, TypeScript, Remotion, and Vite. Build a 9:16 reel from editable scenes, direct it manually or with a local Llama model, preview frame-accurately, save automatically, and export a real WebM video in the browser.

## Run locally

Requires Node.js 24+.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. The editor contains no remote runtime requests; projects are saved in `localStorage` under a versioned schema.

## Local AI creation

The editor can use `llama3.2:latest` through Ollama to generate a complete sequence of editable scenes or rewrite only the selected scene. AI and manual editing share the same controls: headline, supporting copy, accent, background, alignment, duration, order, and entrance animation. Remotion remains the renderer; model output is constrained to a JSON schema and validated before it reaches project state.

```bash
ollama pull llama3.2
ollama serve
```

Keep Ollama running, start ReelMaker with `npm run dev`, then use **AI scene builder** in the properties panel. Choose **Full reel** to replace the sequence or **Rewrite scene** to preserve the rest of the edit. The request goes directly from the browser to `http://127.0.0.1:11434`; prompts and generated content remain on the local machine. Ollama allows local browser origins by default. If ReelMaker is served from a non-local origin, configure that origin with Ollama's `OLLAMA_ORIGINS` setting.

## Scene editing

Use the left scene rail to add, select, reorder, duplicate, or delete up to eight scenes. Every scene has independent copy, styling, duration, and motion. The bottom timeline shows the relative duration and order of the complete reel. Existing version 1 single-scene drafts are upgraded to the scene model when first opened.

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
