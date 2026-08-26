# ReelMaker

A local-first, responsive short-form video editor built with React, TypeScript, Remotion, and Vite. Build a 9:16 reel from editable scenes, direct it manually or with a local Llama model, preview frame-accurately, save automatically, and export a real WebM video in the browser.

## Run locally

Requires Node.js 24+.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. Projects are always saved immediately in `localStorage` under a versioned schema. Optional database sync is disabled unless Supabase environment variables are configured.

## Local AI creation

The editor can use `llama3.2:latest` through Ollama to generate a complete sequence of editable scenes or rewrite only the selected scene. AI and manual editing share the same controls: headline, supporting copy, accent, background, alignment, duration, order, and entrance animation. Remotion remains the renderer; model output is constrained to a JSON schema and validated before it reaches project state.

```bash
ollama pull llama3.2
ollama pull embeddinggemma
ollama serve
```

Keep Ollama running, start ReelMaker with `npm run dev`, then use **AI scene builder** in the properties panel. Choose **Full reel** to replace the sequence or **Rewrite scene** to preserve the rest of the edit. The request goes directly from the browser to `http://127.0.0.1:11434`; prompts and generated content remain on the local machine. Ollama allows local browser origins by default. If ReelMaker is served from a non-local origin, configure that origin with Ollama's `OLLAMA_ORIGINS` setting.

`embeddinggemma` is optional when database sync is disabled. When sync is configured, it embeds briefs and successfully exported reels so similar approved work can be retrieved for later prompts.

## Scene editing

Use the left scene rail to add, select, reorder, duplicate, or delete up to eight scenes. Every scene has independent copy, styling, duration, and motion. The bottom timeline shows the relative duration and order of the complete reel. Existing version 1 single-scene drafts are upgraded to the scene model when first opened.

## Optional Supabase database

The database layer uses PostgreSQL with pgvector. Local storage remains the offline source of truth; when Supabase is configured, ReelMaker also synchronizes the current project, records AI generations, versions successful exports, and stores export embeddings as private retrieval memories.

1. Create a Supabase project and enable **Allow anonymous sign-ins** under Authentication settings.
2. Link the project and apply the committed migration:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

3. Copy `.env.example` to `.env.local` and add the project URL and browser-safe publishable key:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Never expose a Supabase secret or service-role key through a `VITE_` variable. The migration enables Row Level Security on every private table, revokes public anonymous access, and limits records and similarity search to the authenticated owner. Anonymous accounts are local to the browser until a permanent identity is linked; clearing browser data can make the same anonymous account unrecoverable.

For an internet-facing deployment, add Turnstile or another CAPTCHA to the anonymous sign-in flow before enabling public registration, and configure cleanup for abandoned anonymous users. Custom Supabase domains must also be added to the deployment Content Security Policy; the included nginx policy permits `*.supabase.co`.

### Learning loop

The model weights do not change automatically. ReelMaker uses retrieval-augmented generation:

1. A successful export is treated as positive feedback.
2. The final editable project is versioned and embedded locally with `embeddinggemma`.
3. The vector and readable scene summary are saved under the current database user.
4. A later brief retrieves the most similar exported reels through pgvector.
5. Those examples are added to the Llama prompt as references, with an instruction not to copy wording.

If Supabase, authentication, or embeddings are unavailable, synchronization and retrieval fail safely without blocking local editing, generation, or export.

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
