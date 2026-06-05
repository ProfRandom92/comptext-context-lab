---
name: comptext-pipeline
description: Project conventions for the comptext-cli web rebuild — Context Pack pipeline (Inspect → Pack → Policy Gate → Provider → Proposal → Review → Artifacts), data model, server functions, and review-gate states. Apply whenever working on inspect/pack/policy/proposal/review features or related DB schema.
---

# comptext-cli Web — Pipeline Conventions

The app is a browser adaptation of the Rust CLI `ProfRandom92/comptext-cli`. It does NOT replicate the CLI binary; it implements the Context Pack workflow as a web app on TanStack Start + Lovable Cloud.

## Pipeline (canonical order)

```
GitHub URL → Inspect → Context Pack → Policy Gate → Provider → Proposal → Review → Artifacts
```

Never skip or reorder stages. Each stage has a single owning server function and writes its result to the corresponding table.

| Stage         | Server fn (createServerFn)    | Writes to        |
| ------------- | ----------------------------- | ---------------- |
| Inspect       | `inspectRepo`                 | `context_packs`  |
| Policy Gate   | (pure, runs client/server)    | `context_packs.policy_result` |
| Provider call | `askProvider`                 | `proposals`      |
| Review        | `submitReview`                | `reviews`        |
| Export        | `exportReport`                | — (returns blob) |

## Data model

All tables live in `public` with RLS scoped to `auth.uid()`. Required tables:

- `profiles` — 1:1 with `auth.users`, created by trigger on signup.
- `policies` — user-owned policy presets (max file size, denied paths, license rules).
- `context_packs` — `{ repo_url, ref, file_count, total_bytes, files_jsonb, policy_result }`.
- `proposals` — `{ pack_id, model, prompt, response, tokens_in, tokens_out }`.
- `reviews` — `{ proposal_id, state: 'PASS'|'NOTES'|'BLOCKED', notes }`.

Every `CREATE TABLE` migration MUST include `GRANT` statements for `authenticated` + `service_role` (see public-schema-grants rule) and `ENABLE ROW LEVEL SECURITY` plus policies before being shipped.

## Review-gate states

Only three terminal states exist. Do not invent intermediate states (no `PENDING_APPROVAL`, no `NEEDS_REWORK`).

- `PASS`   — proposal accepted as-is.
- `NOTES`  — accepted with reviewer notes; notes are mandatory.
- `BLOCKED` — rejected; notes are mandatory and surfaced as the artifact's blocker reason.

UI color tokens (defined in `src/styles.css`):
- PASS    → `--state-pass` (green)
- NOTES   → `--state-notes` (amber)
- BLOCKED → `--state-blocked` (red)

Never hardcode `text-green-500` etc.; always use the semantic token.

## Provider (Lovable AI Gateway)

- Default model: `google/gemini-2.5-flash`. Upgrade path: `google/gemini-2.5-pro` for `pack.total_bytes > 200_000`.
- Never call OpenAI / Gemini directly with a user-supplied key; the gateway is the only allowed path.
- No local Ollama support — the browser cannot reach `localhost:11434`. Reject feature requests for it with a pointer to this rule.

## Out of scope (do not implement)

These belong to the CLI and are explicitly NOT part of the web rebuild:
- `cargo` / Validate / Benchmark commands
- Apply-Gate writes back to GitHub (we are read-only via GitHub REST)
- Cryptographic provenance, skill registry, git hook integration

When the user asks for any of the above, explain the scope boundary before refusing or rescoping.

## File conventions

- Server functions live under `src/lib/*.functions.ts` (NOT `src/server/`).
- GitHub REST helpers in `src/lib/github.server.ts` — server-only, uses unauthenticated REST for public repos; rate-limit guard required.
- Pipeline UI is a single page at `src/routes/_authenticated/pipeline.tsx` with stage components in `src/components/pipeline/`.
