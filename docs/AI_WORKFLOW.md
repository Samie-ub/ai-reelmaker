# AI workflow

ReelMaker uses AI as a constrained creative planner, not as an autonomous agent. Its only authority is to propose editable scene data that passes the same domain validation as manual edits.

## Request flow

```text
Editor intent + current ReelProject
              │
              ├─> curated creative recipe ranking (Supabase or local fallback)
              ├─> owner-scoped, template/mode-filtered memory retrieval
              │
              v
       typed GenerationRequest
              │
              v
 versioned prompt builder (system rules + JSON user/context data)
              │
              v
       local Ollama chat API
              │
              v
 mode-specific JSON schema + semantic validation
              │
              v
 editable project update + durable generation lineage
```

The permanent system message describes supported and unsupported product capabilities. User text, curated recipes, current project copy, and retrieved examples are serialized into a separate user message and explicitly treated as untrusted data. Scene rewrites include the selected scene and every neighboring scene.

## Contracts and safeguards

- `project` mode returns one to five scenes totaling 6–30 seconds.
- `scene` mode returns exactly one replacement scene.
- Every scene uses validated alignment, duration, and animation values.
- Every scene accepts a custom six-digit hex background, accent, primary text, and supporting text color.
- Explicit hex colors in a user request must appear in the returned theme or generation is rejected.
- Text colors are normalized to at least 4.5:1 contrast against the scene background.
- Headlines permit at most one newline.
- Unsupported media, audio, caption, transition, publishing, or executable-code requests are omitted and reported as warnings.
- Prompt versions and model identifiers are stored with generation history.
- Retrieved memories must match the current owner, template, generation mode, embedding model, and minimum similarity threshold.
- Curated recipes are ranked by requested colors, style, use case, selected template, and quality score. Explicit user colors override recipe palettes.
- An applied generation is linked locally to its generated scene revision. Export feedback records fields changed after generation instead of assuming the generated result was exported unchanged.

## Evaluation

Normal tests validate prompt-role separation, complete rewrite context, custom theme safety, exact hex preservation, recipe ranking, mode-specific schemas, semantic limits, injection containment, retrieval filters, and export attribution.

A live Ollama evaluation suite checks factual preservation, rewrite behavior, exact custom colors, unsupported-capability warnings, and prompt-injection resistance:

```bash
npm run eval:ai
```

The live suite requires `llama3.2:latest` and a running Ollama service. It is intentionally excluded from `npm test` so normal verification remains deterministic and does not require a local model.

## Boundaries for future work

Add new AI operations as explicit request modes with their own schema and evaluations. Do not give the model direct storage, export, browser, or publishing tools unless the product introduces a reviewed permission and confirmation design for those actions.

Curated recipes intentionally describe only controls the renderer can currently express. Typography families, arbitrary layouts, assets, and advanced motion should not be added to recipe data until the project schema and renderer support them.
