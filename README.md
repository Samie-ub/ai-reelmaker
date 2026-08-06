# ReelMaker

A local-first, responsive short-form video editor built with React, TypeScript, Remotion, and Vite. Choose a reusable 9:16 template, edit copy and timing, preview frame-accurately, save automatically, and export a real WebM video in the browser.

## Run locally

Requires Node.js 24+.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. The editor contains no remote runtime requests; projects are saved in `localStorage` under a versioned schema.

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
