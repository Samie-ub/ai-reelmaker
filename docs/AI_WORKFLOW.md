# AI workflow

ReelMaker uses AI as a constrained creative planner, not as an autonomous agent. Its only authority is to propose editable scene data that passes the same domain validation as manual edits.

## Request flow

```text
Editor intent + current ReelProject
              │
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

The permanent system message describes supported and unsupported product capabilities. User text, current project copy, and retrieved examples are serialized into a separate user message and explicitly treated as untrusted data. Scene rewrites include the selected scene and every neighboring scene.

## Contracts and safeguards

- `project` mode returns one to five scenes totaling 6–30 seconds.
- `scene` mode returns exactly one replacement scene.
- Every scene uses approved palettes, alignment, duration, and animation values.
- Headlines permit at most one newline.
- Unsupported media, audio, caption, transition, publishing, or executable-code requests are omitted and reported as warnings.
- Prompt versions and model identifiers are stored with generation history.
- Retrieved memories must match the current owner, template, generation mode, embedding model, and minimum similarity threshold.
- An applied generation is linked locally to its generated scene revision. Export feedback records fields changed after generation instead of assuming the generated result was exported unchanged.

## Evaluation

Normal tests validate prompt-role separation, complete rewrite context, mode-specific schemas, semantic limits, injection containment, retrieval filters, and export attribution.

A live Ollama evaluation suite checks factual preservation, rewrite behavior, unsupported-capability warnings, and prompt-injection resistance:

```bash
npm run eval:ai
```

The live suite requires `llama3.2:latest` and a running Ollama service. It is intentionally excluded from `npm test` so normal verification remains deterministic and does not require a local model.

## Boundaries for future work

Add new AI operations as explicit request modes with their own schema and evaluations. Do not give the model direct storage, export, browser, or publishing tools unless the product introduces a reviewed permission and confirmation design for those actions.
