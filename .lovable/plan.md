
# CompText Web — Plan

Eine Web-Adaption der `ctxt`-CLI. Die echte CLI ist ein Rust-Binary, das lokal ein Repo inspiziert, `cargo` ausführt und Ollama/OpenAI ansprechen kann — das geht 1:1 nicht im Browser. Stattdessen bauen wir die zentrale Idee nach: **Repo → Context Pack → Policy Gate → Provider → Proposal → Review → Artifacts**, mit GitHub-Repos als Input-Quelle und Lovable AI als Provider.

## Was wird gebaut (MVP)

**Workflow im Browser:**

```text
GitHub-URL ──► Inspect ──► Context Pack ──► Policy Gate ──► Provider ──► Proposal ──► Review ──► Artifacts
                 (Tree)      (.json)        (Allow/Deny)     (AI)        (.json)     (Approve)   (History)
```

1. **Inspect** — User gibt öffentliches GitHub-Repo + optionalen Pfad ein. Server holt Dateibaum + ausgewählte Textdateien via GitHub API.
2. **Context Pack** — deterministische JSON-Struktur (sortiert, gehasht): `{ repo, files[], task, sha256 }`. Anzeige als pretty-JSON mit Copy/Download.
3. **Policy Gate** — Regeln (Allow-/Deny-Globs, Max-Größe, Secrets-Heuristik). Pack wird PASS / BLOCKED markiert, mit Begründung.
4. **Ask Provider** — Pack + Task gehen an Lovable AI Gateway (Gemini-Default, „Dummy"-Provider für Dry-Run). Antwort wird als *untrusted* behandelt.
5. **Proposal** — strukturierte JSON-Antwort (Plan-Schritte, betroffene Dateien, Diff-Vorschläge). Validierung gegen Schema.
6. **Review-Gate** — UI: PASS / PASS WITH NOTES / BLOCKED, mit Notiz. Keine echten Repo-Mutationen — nur Artefakt-Status.
7. **Artifacts & History** — alle Packs, Proposals, Reviews persistiert in Lovable Cloud, pro User, mit Phase-Report (Markdown-Export).

## Routes (TanStack Start)

```text
/                    Landing (Hero, Pipeline-Diagramm, CTA)
/auth                Login / Signup
/_authenticated/
  workspace          Liste der Sessions/Artefakte
  inspect            Repo-URL + Task-Eingabe → erzeugt Context Pack
  pack/$id           Pack-Detail + Policy-Gate-Ergebnis + „Ask Provider"
  proposal/$id       Proposal-Anzeige + Review-Gate
  artifacts          History (Packs, Proposals, Reports)
  settings           Provider/Policy-Profile
/about               Hintergrund + Link zum Original-Repo
```

## Datenmodell (Lovable Cloud / Postgres)

- `profiles(user_id, display_name)`
- `policies(id, user_id, name, allow_globs[], deny_globs[], max_file_kb)`
- `context_packs(id, user_id, repo_url, ref, task, pack_json, sha256, gate_status, gate_reason, created_at)`
- `proposals(id, user_id, pack_id, provider, model, response_json, valid, error, created_at)`
- `reviews(id, user_id, proposal_id, status[pass/notes/blocked], notes, created_at)`

RLS: alle Tabellen scoped auf `auth.uid()`. Rollen via separater `user_roles`-Tabelle (Standardmuster), nur Admin sieht globale Stats.

## Server-Endpunkte (createServerFn)

- `inspectRepo({repoUrl, ref, task, paths?})` — GitHub-API, baut Pack, wendet Policy an, persistiert.
- `askProvider({packId, provider})` — Lovable AI Gateway, JSON-Schema-Mode, persistiert Proposal.
- `submitReview({proposalId, status, notes})` — speichert Review.
- `exportReport({packId})` — Markdown-Report (Pack + Proposal + Review).

## Out-of-scope (bewusst)

- Kein echtes `cargo`/Validate/Benchmark — wir spiegeln den Workflow, führen aber keinen Rust-Code aus.
- Kein Apply-Gate, das wirklich Dateien schreibt (Repo ist read-only über GitHub-API). Apply erzeugt nur einen herunterladbaren Patch.
- Kein lokaler Ollama-Adapter (Browser kann nicht `localhost:11434` erreichen). Provider = Lovable AI + Dummy.
- Keine Cryptographic Provenance/Skill Registry/Hook Integration der späteren Phasen — wir fokussieren auf Phase 2–9 als Web-MVP.

## Stack

- TanStack Start (vorhanden), Tailwind/shadcn
- Lovable Cloud (Auth, DB, RLS)
- Lovable AI Gateway (Provider)
- GitHub REST API (öffentliche Repos, kein Token nötig für MVP; optional PAT in Settings)

## Design-Richtung

Terminal-/Engineering-Ästhetik: dunkler Hintergrund, Monospace-Akzente (JetBrains Mono) + sauberer Sans (Inter), grün/amber Akzent für Gate-Status (PASS/BLOCKED), viel Whitespace, klare Pipeline-Visualisierung auf der Landing.

## Reihenfolge der Umsetzung

1. Lovable Cloud aktivieren, Auth + Tabellen + RLS
2. Landing + Routing-Grundgerüst
3. Inspect-Flow (GitHub-API, Pack-Erzeugung, Policy-Gate)
4. Provider-Call + Proposal-Anzeige
5. Review-Gate + Artifacts-History
6. Report-Export + Settings (Policies)

Soll ich so loslegen, oder willst du den Scope vorher kürzen (z. B. ohne Auth/History, nur „URL rein → Pack + Proposal raus")?
