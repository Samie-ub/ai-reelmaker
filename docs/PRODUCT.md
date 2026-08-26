# ReelMaker Product and Delivery Brief

## Product thesis

ReelMaker gives content creators and hands-on video editors a fast, controlled path from a reusable template to a polished vertical social video: choose a proven structure, customize the message and timing in one focused workspace, preview the exact 9:16 result, and export without learning a full professional editor.

## User and evidence

- **Primary user:** a creator who publishes short-form video repeatedly and values speed without accepting generic output.
- **Job to be done:** turn an idea or promotion into a correctly sized, editable, publishable short video with minimal setup.
- **Highest-value moment:** the first accurate preview after changing the template copy, followed by a successful local export.
- **Smallest useful evidence:** during moderated testing, 4 of 5 target users can select a template, change the headline, preview, and export without assistance in under five minutes; at least 3 say they would use it for a real post.

### Known facts

- The product targets content creators and video editors.
- It is a responsive production web app using Remotion for composition and preview.
- The required visual language is ClickHouse-inspired black, white, and electric yellow.
- A vertical preview, editable controls/timeline, template cards, aspect-ratio indicators, and a clear export action are required.
- Authentication, billing, analytics, collaboration, and cloud services are not requested.

### Assumptions and unanswered questions

- **Assumption:** the first release remains local-first; drafts live in browser storage and optionally synchronize to an owner-isolated PostgreSQL database.
- **Assumption:** 1080×1920, 30fps, and 6–30 seconds cover the initial use case.
- **Assumption:** text-led motion templates with optional local AI creative direction are sufficient to validate usefulness before uploads and audio licensing are introduced.
- **Question:** is MP4 mandatory at launch, or is standards-compliant WebM acceptable for initial validation?
- **Question:** which browsers and export codecs must be officially supported?
- **Question:** will customer-supplied media be processed locally or uploaded in the future?
- **Question:** what retention policy should apply when server rendering is introduced?

### Risks and constraints

- Browser video encoding varies by codec and device; the current local WebM export must feature-detect support and recover cleanly.
- Remotion's production MP4 renderer is a server-side workload with Chromium, storage, queueing, and cost controls; it is intentionally behind an adapter boundary.
- Browser storage can be cleared and is not cross-device. Drafts must be treated as recoverable convenience, not durable storage.
- Rendering can be CPU intensive. Duration is constrained to 6–30 seconds and export has visible progress/cancel handling.
- User-authored text is untrusted. It is rendered as React text content, validated by schema, and never interpreted as HTML.

## Scope

### Core journey

1. Open the template library and inspect reusable template cards.
2. Choose a template and enter the editor with a valid starter project.
3. Add, select, reorder, duplicate, or remove scenes and edit each scene's copy, palette, duration, alignment, and entrance animation.
4. Play or scrub the exact 9:16 Remotion preview and inspect the timeline.
5. Export a WebM locally, or download the project JSON for portability.
6. Recover the latest valid draft after refresh.
7. Optionally turn a natural-language brief into a validated scene sequence, or ask local Llama to rewrite only the selected scene.

### In scope

- Template library with category filtering and empty-safe search.
- A focused responsive scene editor with preview, scene rail, properties, proportional timeline, validation, autosave status, undo-by-reset, and destructive reset confirmation.
- Remotion composition and player using shared typed project data.
- Local draft persistence with schema validation and stale/corrupt-state recovery.
- Real local WebM export with feature detection, progress, cancellation, and failure states.
- Optional local Ollama assistance for the same copy, palette, alignment, duration, and animation fields exposed to manual editing, with whole-reel and selected-scene modes, strict schema validation, and no generated executable code.
- Optional Supabase project synchronization, generation history, export snapshots, and owner-scoped pgvector retrieval memory, while preserving uninterrupted local-only operation.
- Accessible keyboard navigation, focus visibility, dialog focus management, labels, reduced motion, and 44px primary touch targets.
- Strict type checking, linting, unit/integration tests, and production build.

### Out of scope

- Permanent accounts, teams, billing, analytics, comments, and uploaded media storage.
- Uploaded image/video/audio assets, licensed stock media, generative image/video models, captions/transcription, and social publishing.
- Multi-track nonlinear editing, transitions marketplace, keyframes, or arbitrary scene graphs.
- Server MP4 rendering, render queues, notifications, and durable render history.

## UX structure and visual blueprint

### Template library (`/`)

- **Focal point:** the “Start with a structure” heading and three product-authentic 9:16 template previews.
- **Hierarchy/order:** compact product header → headline and project status → category filters → template grid → yellow “built for repeatable work” band.
- **Primary action:** “Use template” on each card. Secondary action: “Continue editing” when a draft exists.
- **Components:** logo/wordmark, status badge, segmented category tabs, template cards, duration/aspect metadata, inline empty search state.
- **Responsive:** three columns at ≥1024px, two at 768px, one at mobile; header actions remain reachable without a decorative hamburger menu.
- **Imagery:** generated product UI compositions only—CSS-rendered previews using the same template data, with no external/proprietary assets.

### Editor (`/editor/:templateId`)

- **Focal point:** the portrait preview in a centered black stage; the yellow Export action remains visible in the header.
- **Hierarchy/order:** editor header → controls/preview/properties workbench → timeline. Desktop is a 240px / flexible / 300px three-column workspace. Tablet moves templates into a horizontal rail. Mobile becomes preview-first with controls below and a horizontally scrollable timeline.
- **Primary action:** Export video. Secondary actions: play/pause, change template, edit properties, download project, reset.
- **Components:** template rail, aspect badge, Remotion Player, labeled fields, alignment group, duration range, swatches, timeline ruler/clips/playhead, export dialog, toast/status region.
- **States:** initial loading skeleton, empty/no-template recovery, validation errors, saved/saving status, export idle/rendering/success/error/cancelled, reset confirmation.
- **Keyboard/focus:** native fields, Space handled by Player only when focused, arrow-accessible slider, dialog traps focus through native modal semantics, Escape closes dialogs, focus returns to invoking control.

### Visual translation

- The design's near-black canvas, compressed Inter hierarchy, subtle hairline panels, flat surfaces, and scarce electric-yellow action signal map naturally to an editing workspace.
- The marketing-style 96px section spacing is reduced inside the editor to preserve tool density; the library retains larger editorial spacing.
- Code cards are deliberately replaced by product UI/timeline fragments because the user workflow is video editing, not SQL. This is the principal usability departure from the reference language.
- The specified 36px icon control is raised to 44px for primary touch interactions to meet the product accessibility constraint.
- Adaptive theme means the OS color-scheme metadata is respected, but the authored product canvas remains dark because the selected design explicitly has no light surface; native form controls use `color-scheme: dark`.

## Architecture

### Stack and module boundaries

- **React + TypeScript + Vite:** compact, strictly typed client delivery with fast build and test feedback.
- **Remotion Player/composition:** deterministic frame-driven preview.
- **Zod:** validates template-derived projects and untrusted local persistence.
- **Vitest + Testing Library:** domain and interaction coverage.
- `src/domain`: project schema, templates, and pure transforms.
- `src/video`: deterministic composition and browser export adapter.
- `src/infrastructure`: versioned local persistence.
- `src/features`: route-level library/editor UI and feature components.
- `src/ui`: reusable chrome and semantic controls.

Data flows from immutable templates into a validated `ReelProject` containing one to eight ordered scenes. The editor and Ollama adapter both produce the same scene contract. The editor owns transient state, saves through the persistence adapter, and passes the same project into the Remotion composition and export renderer. No UI component reads storage directly.

### Security and data boundaries

- Trust boundaries: URL template identifiers, localStorage JSON, user text, browser media APIs, and downloaded filenames.
- Zod rejects malformed or stale persisted state; unknown template IDs fall back to a safe library route.
- Text is length constrained and rendered without HTML injection. Export names are sanitized.
- No secret database keys, behavioral tracking, or media uploads exist in this release. Optional AI requests go to the user's loopback Ollama service; database calls occur only when browser-safe Supabase configuration is present.
- Export is explicitly initiated, cancellable, and only creates an object URL for the generated file; URLs are revoked after use.
- CSP should be set by the deployment host (`default-src 'self'; style-src 'self' 'unsafe-inline'; media-src 'self' blob:; worker-src 'self' blob:`) and tightened if font/assets move off inline styling.

### Production operations

- Deploy the static `dist` artifact to a versioned CDN/host with immutable hashed assets, SPA fallback, TLS, CSP, `X-Content-Type-Options`, and a restrictive permissions policy.
- Client failures are caught by an error boundary; export errors are surfaced with a retry path. Host-level logs and synthetic checks cover availability without adding behavioral analytics.
- Performance budgets: initial compressed JS <350KB excluding Remotion vendor chunk, LCP <2.5s on a representative mid-tier mobile connection, input response <200ms, no layout shift from preview sizing.
- Rollback is an atomic switch to the previous versioned static artifact. Local project schema changes must be backward-readable for one version.

## Upgrade path

- `VideoExporter` is replaceable. Move from `BrowserWebmExporter` to a server Remotion MP4 adapter when validated users require MP4, unsupported-browser export exceeds 5%, or median local export exceeds 2× video duration.
- `ProjectRepository` keeps local storage as the fast offline source and optionally mirrors validated projects to owner-isolated Supabase rows. Link anonymous identities to permanent authentication before promising cross-device recovery.
- Uploaded media adds an `AssetRepository`, signed uploads, malware/type validation, lifecycle deletion, and rights acknowledgement only after text-led templates demonstrate repeat use.
- Sequence server rendering as: version project schema → add idempotent render API → queue and worker → private object storage → signed downloads → retention cleanup → observability/cost alerts. Keep browser export as fallback through migration.
- Perform only lossless, backward-compatible local draft migrations automatically. Require explicit import and report unsupported fields for any migration that cannot preserve the complete source; keep downloadable JSON as the compatibility escape hatch.

## Phased implementation plan

1. **Foundation** — repository agreement, design source of truth, build/test tooling, tokens, route shell. Acceptance: app boots, typecheck/lint/build pass, keyboard focus is visible.
2. **Core domain and library** — schemas, templates, search/filter, draft recovery. Acceptance: valid template starts an editor project; malformed saved state cannot crash the app; template logic is unit-tested.
3. **Editor vertical slice** — Remotion preview, project controls, persistence, timeline, responsive workbench. Acceptance: edits update preview immediately, survive reload, validate, and remain usable at 375/768/1024/1440 widths.
4. **Export and recovery** — real WebM adapter, progress/cancel/error/success dialog, JSON portability, reset confirmation. Acceptance: supported browsers download a playable vertical video; unsupported APIs show actionable failure; destructive reset requires confirmation.
5. **Production verification** — tests, accessibility checks, visual inspection, performance/build review, docs. Acceptance: mandated checks pass; primary screens and major states are inspected at all required viewports with no clipping or accidental overflow.

## Quality and security checklist

- [ ] Strict types and schema validation at persistence/URL boundaries.
- [ ] No dangerously-set HTML, secrets, remote data, or implicit destructive action.
- [ ] Loading, empty, validation, export success/error/cancel, and recovery states.
- [ ] Keyboard focus, labels, dialog semantics, reduced motion, and 44px touch targets.
- [ ] Domain, persistence, API-capability failure, and high-value UI tests.
- [ ] Typecheck, lint, tests, build, and rendered viewport inspection.
- [ ] Versioned static deployment and one-click artifact rollback documented.
