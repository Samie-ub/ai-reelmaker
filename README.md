# ReelMaker

### Create polished vertical videos with manual control and private, local AI.

ReelMaker is a local-first motion editor for building short-form, 9:16 videos from editable scenes. Write and style every scene yourself, ask a local Llama model to create a full reel or rewrite one section, preview the result frame by frame, and export directly from the browser.

No AI subscription is required. Video rendering stays on your device, and cloud synchronization is entirely optional.

> **Development status:** ReelMaker is an early-stage product under active development. The editor is functional, but the current release is not yet intended as a replacement for a full nonlinear video editor.

## Why ReelMaker

Most AI video tools trade creative control for speed. ReelMaker keeps the generated result inside the same structured editor used for manual work, so every AI-created scene remains editable.

- **Edit everything** — control copy, colors, alignment, timing, sequence, and motion.
- **Use private AI** — generate locally with `llama3.2:latest` through Ollama.
- **Work scene by scene** — create, reorder, duplicate, rewrite, or remove up to eight scenes.
- **Preview accurately** — use Remotion for deterministic, frame-based playback.
- **Export locally** — render the exact preview composition as a 1080×1920 H.264 MP4 without uploading source media.
- **Build useful memory** — optionally retrieve patterns from previously exported reels using PostgreSQL and pgvector.

## Product overview

| Area | Current capability |
| --- | --- |
| Canvas | Vertical 1080×1920 video at 30 fps |
| Editing | Structured multi-scene editor with independent copy, styling, duration, and motion |
| AI creation | Full-reel generation and selected-scene rewriting with local Llama 3.2 |
| Preview | Frame-accurate Remotion player and sequence timeline |
| Persistence | Immediate browser storage with optional owner-isolated Supabase sync |
| AI memory | Local embeddings plus private pgvector retrieval from successful exports |
| Export | Browser-rendered H.264 MP4 from the shared Remotion composition |

## Quick start

### Requirements

- Node.js 24 or newer
- npm
- A Chromium-based browser for the most reliable video export experience
- Ollama only if you want local AI features

### Run the editor

```bash
git clone https://github.com/Samie-ub/ai-reelmaker.git
cd ai-reelmaker
npm ci
npm run dev
```

Open the local URL printed by Vite. ReelMaker saves valid project changes immediately in versioned browser storage. Supabase and Ollama are optional; the manual editor works without either service.

## Enable local AI

ReelMaker uses Ollama directly from the browser. `llama3.2:latest` generates structured creative direction, while `embeddinggemma:latest` creates embeddings for optional retrieval memory.

```bash
ollama pull llama3.2
ollama pull embeddinggemma
ollama serve
```

With ReelMaker and Ollama running, open **AI scene builder** in the properties panel:

- Choose **Full reel** to replace the current sequence.
- Choose **Rewrite scene** to update only the selected scene.

AI output is constrained to the same validated project schema used by manual controls. It cannot inject executable code into the composition. Requests are sent directly to `http://127.0.0.1:11434`; if the editor is hosted on a non-local origin, add that origin to Ollama's `OLLAMA_ORIGINS` configuration.

`embeddinggemma` is not required unless optional database sync and retrieval memory are enabled.

## Enable database sync and AI memory

ReelMaker can connect to Supabase for PostgreSQL persistence, anonymous owner identity, project history, and pgvector similarity search. Browser storage remains the local source of truth, so database or network failures do not block manual editing or export.

### 1. Create the Supabase project

Create a project and enable **Allow anonymous sign-ins** in its Authentication settings.

### 2. Apply the database migration

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migration is located at [`supabase/migrations/20260826000000_reelmaker_learning.sql`](supabase/migrations/20260826000000_reelmaker_learning.sql).

### 3. Configure the browser client

Copy `.env.example` to `.env.local` and provide only the browser-safe project values:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Never place a secret or service-role key in a `VITE_` variable. Vite exposes these variables to browser code.

### 4. Verify the connection

Verify the configured project, authentication, migration, RLS access, and pgvector function from the terminal:

```bash
npm run verify:database
```

The full verification creates one anonymous Supabase user, just like ReelMaker's first cloud sync, and signs out when it finishes. To check only configuration and API reachability without creating a user, run `npm run verify:database -- --api-only`. Neither command prints the publishable key.

### How memory works

ReelMaker does not retrain or modify the Llama model. It uses retrieval-augmented generation:

1. A successful export is treated as a positive outcome.
2. The editable project is versioned and summarized.
3. `embeddinggemma:latest` creates a local vector representation.
4. The summary and vector are stored under the current database owner.
5. Similar exported reels are retrieved as structural references for future prompts.

If authentication, Supabase, or embeddings are unavailable, the memory step fails safely and the core editor continues working.

## Architecture

```text
Manual controls ─┐
                 ├─> Validated ReelProject ─> Remotion preview ─> Local MP4 export
Local Ollama ────┘             │
                               ├─> Browser storage
                               └─> Optional Supabase + pgvector memory
```

### Technology

- React and TypeScript for the editor
- Remotion for deterministic video composition and preview
- Vite for development and production builds
- Zod for project and model-output validation
- Ollama for local generation and embeddings
- Supabase, PostgreSQL, and pgvector for optional sync and retrieval
- Vitest and Testing Library for automated verification

## Privacy and security

- Video encoding happens in the browser; video media is not uploaded to Supabase.
- Local AI prompts and generation requests go to the loopback Ollama service.
- Every private database table uses Row Level Security and owner-scoped policies.
- Similarity search is restricted to the authenticated owner.
- Anonymous identities are tied to local browser state until permanent authentication is added. Clearing browser data can make an anonymous account unrecoverable.
- Public deployments should protect anonymous sign-up with CAPTCHA and clean up abandoned anonymous users.
- Custom Supabase domains must be added to the deployment Content Security Policy. The included nginx policy already permits `*.supabase.co`.

## Development

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit --audit-level=moderate
```

Additional commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run test:watch` | Run tests interactively while developing |
| `npm run preview` | Preview the production build locally |
| `npm run verify:database` | Verify the configured Supabase database and application access |

## Production container

The included multi-stage `Dockerfile` builds the application and serves it from unprivileged nginx on port `8080`. It includes SPA routing, security headers, and a `/healthz` endpoint.

```bash
docker build -t reelmaker .
docker run --rm -p 8080:8080 reelmaker
```

## Roadmap

The current release focuses on a reliable text-led editor. Planned product areas include:

- Permanent accounts and cross-device project recovery
- Uploaded image, video, and audio assets
- Captions, transcription, and audio tracks
- Richer transitions, keyframes, and multi-track editing
- Background cloud rendering and durable render history
- Publishing workflows for short-form platforms

The current browser MP4 exporter and local-first workflow will remain useful fallbacks when background cloud rendering is introduced.

## Repository workflow

- `main` is the production branch.
- `dev` is the integration branch.
- Features and maintenance changes are pushed to focused working branches for owner review.
- Major product or operational changes must update this README in the same branch.

See [`AGENTS.md`](AGENTS.md) for the full working agreement and [`docs/PRODUCT.md`](docs/PRODUCT.md) for product scope, security boundaries, acceptance criteria, and the server-rendering upgrade path.
