<!-- TODO: delete this file once Spotify completes the QA + task-authoring pipeline. -->

# Spotify Clone — Readiness for the Pipeline

As of 2026-04-19 the Spotify clone at
`bssngss2-design/spotify-clone` is **not on the collinear-ai org
yet** and therefore not a pipeline participant. This PR updates
`scripts/validate.sh` to accept both the Vite layout (every existing
clone) and the Next.js layout (Spotify) so that once the repo is
transferred, it can enter the pipeline without a structural
rewrite.

This doc captures what is present, what is missing, and the
recommended path to make Spotify a first-class pipeline participant
without forcing a framework rewrite.

---

## What Spotify gets right

- **Tool-server contract is honored.** `backend/app/routers/step.py`
  implements `GET /health`, `GET /tools`, `POST /step`, `POST /reset`,
  `GET /snapshot` at the root of the FastAPI app — the same surface
  the rl-gym framework and every other clone exposes.
- **26 tools registered** via `ToolDef(...)` in
  `backend/app/tools.py`, covering auth, songs, playlists, liked
  songs, player state, discovery. Each has a Pydantic args model and
  a structured-content handler.
- **Dispatcher behaves.** Invalid tool names return `is_error: true`
  with a structured message; bad args are caught by Pydantic
  validation; `AuditLog` captures every call.
- **`spec/FEATURES.md` exists** and is current.
- **Seed script exists** (`backend/seed.py`) and is invoked by the
  Makefile.

A GET against `http://localhost:3010/` already redirects through the
Next.js login flow, so the frontend is alive on the canonical port.

---

## Structural delta from the Vite template

Before the validator update that ships with this PR, Spotify hit
0/10 required paths. The table below shows the delta; the right
column is the Next.js path the updated `validate.sh` now accepts.

| Vite-template path | Spotify actual (Next.js) |
|---|---|
| `app/server.py` | `backend/app/main.py` |
| `app/models.py` | `backend/app/models.py` |
| `app/schema.py` | `backend/app/schemas.py` |
| `app/postgres/init.sql` | SQLAlchemy `create_all()` at startup |
| `app/seed/seed_app.py` | `backend/seed.py` |
| `app/frontend/package.json` | `package.json` (repo root) |
| `app/frontend/src/App.tsx` | `src/app/layout.tsx` |
| `app/tests/test_tools.py` | `backend/tests/` |
| `docker-compose.dev.yml` | `docker-compose.yml` |
| `spec/FEATURES.md` | `spec/FEATURES.md` |

Post-update, running `validate.sh` against Spotify detects variant
`next` and passes. The remaining blocker is purely org-level: the
repo still lives at `bssngss2-design/spotify-clone`, so there is no
`collinear-ai/spotify-clone` for the orchestrator to target with
PRs.

---

## Recommended path

### Step 1 — Transfer / duplicate to `collinear-ai/spotify-clone`

Same pattern we used for every other clone:

```
gh repo clone bssngss2-design/spotify-clone
gh repo create collinear-ai/spotify-clone --public \
  --source=spotify-clone --push
```

Deprecate the original via a `DEPRECATED.md` note pointing at the new
location, same as the other migrations.

Owner: whoever kicks off Spotify work. Block: none.

### Step 2 — Teach `scripts/validate.sh` about the Next.js variant — DONE

Shipped in this PR. The validator now auto-detects `next` vs `vite`
by presence of `backend/app/main.py` + `src/app/`, then runs the
path checks appropriate for that variant. Tool-registry counting
accepts `ToolDef(...)`, `ToolSpec(...)`, and dict-style `"name":`
entries so no clone needs to change its tool-registration style.

Verified locally across all 11 clones (10 on collinear-ai plus the
template itself): every one now `PASSED`. Spotify detects as
`next`, everything else as `vite`.

Owner: clone-template maintainer. Block: none.

### Step 3 — Normalize the clone's Makefile targets

Whatever the layout, these targets must work identically across
clones so the pipeline doesn't need special cases:

- `make up` — starts postgres + backend + frontend via compose.
- `make seed` — reseeds the DB via the seed script.
- `make test` — runs the tool-server test suite.
- `make validate` — runs `scripts/validate.sh`.

Spotify's Makefile already has `up` / `seed` / `test`. Add a
`validate` target once Step 2 lands.

Owner: Spotify clone maintainer. Block: Step 2.

### Step 4 — Add the three pipeline-required files

Pipeline docs reference these by relative path:

- `PORTS.md` — **already present** at repo root. Confirm it lists
  frontend 3010, backend port, postgres port (if any).
- `tasks/` — create as empty dir with a placeholder
  `tasks/README.md` so the QA audit Phase 1 has somewhere to look.
- `QA_REPORT.md` — produced by the QA audit, not pre-created.

Owner: whoever opens the first Spotify PR. Block: Step 1.

### Step 5 — Run the QA audit

Use `pipeline/qa/QA_AUDIT_PROMPT.md` with:

```
CLONE_NAME: Spotify
CLONE_PATH: /path/to/collinear-ai/spotify-clone
FRONTEND_URL: http://localhost:3010
BACKEND_URL: http://localhost:<backend-port-from-PORTS.md>
```

The Phase 1.5 reachability map will be smaller than GitHub's — 26
tools vs ~60 — so expect a single-file report.

Owner: pipeline orchestrator. Block: Steps 1–4.

### Step 6 — Then (and only then) author complex tasks

Run `pipeline/qa/complex-task-authoring.md` against Spotify. The
inventory will cluster around player state, playlists, liked songs,
discovery, and auth. Good complex-task candidates:

- "Build a workout playlist" — sign in, search, create playlist, add
  songs, reorder, set player to first song, seek forward, pause.
  Chains auth → songs → playlists → player across 7+ tools.
- "Recover a deleted playlist" — playlist soft-delete (if the tool
  exists) then restore, ensuring the song order is preserved and the
  player state that referenced it is re-bound correctly.
- "Genre-based discovery" — use `get_home_feed` + `get_recently_played`,
  cross-reference with `list_liked_songs`, build a "Discover" playlist
  of N songs, and verify the verifier can distinguish this from a
  seeded playlist with the same name.

Owner: pipeline orchestrator. Block: Step 5.

---

## Summary

Spotify is the only clone in the fleet where the tool-server contract
is correct but the filesystem shape is Next.js rather than Vite. The
validator update in this PR unblocks the structural check; the
remaining work is the org transfer (Step 1) and the pipeline dry-run
(Steps 3–6). Estimated effort: one afternoon to QA-ready, one more
day to complex-tasks-ready after the audit is green.

Track progress in `pipeline/qa/clone-status.md`.
