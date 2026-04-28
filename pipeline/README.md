# Pipeline Docs

This folder is split by document intent:

- [`build/`](./build/) — docs that drive **building a new clone** from scratch
  (scaffolding, orchestration, the fidelity loop, agent skills, readiness
  contract).
- [`qa/`](./qa/) — docs that drive **QA'ing an existing clone and authoring
  tasks on top of it** (post-build audit, fix rollout, task authoring
  methodology, live status matrix).

If you are handing this template to an AI orchestrator to build a clone
end-to-end, start in `build/`. If you are auditing a clone that already
exists or adding tasks to a shipped clone, start in `qa/`.

---

## `build/` — build-time docs

| Doc | One-line description |
|---|---|
| [`ORCHESTRATOR_BRIEF.md`](./build/ORCHESTRATOR_BRIEF.md) | The end-to-end orchestrator pipeline (phases, gates, exit conditions) used to build a clone from scratch. |
| [`SWARM_PLAN.md`](./build/SWARM_PLAN.md) | Multi-agent swarm orchestration model: how parallel build subagents are split, judged, and rejected. |
| [`AUTONOMOUS_WORKFLOW.md`](./build/AUTONOMOUS_WORKFLOW.md) | Per-page UI fidelity loop used by build agents — screenshot-before-claiming-fixed, multi-pass pattern, rejection template. |
| [`context-for-AI-agent.md`](./build/context-for-AI-agent.md) | General agent skills / UI-fidelity lessons every build subagent inherits. |

## `qa/` — qa-time docs

| Doc | One-line description |
|---|---|
| [`QA_AUDIT.md`](./qa/QA_AUDIT.md) | Post-build bug-hunt methodology — bug class catalog, phases, report schema. |
| [`QA_AUDIT_PROMPT.md`](./qa/QA_AUDIT_PROMPT.md) | Ready-to-paste subagent prompt that produces `QA_REPORT.md` per clone. |
| [`QA_FIX_PROCESS.md`](./qa/QA_FIX_PROCESS.md) | Triage rubric + sequential rollout rules that turn a QA report into merged fix PRs. |
| [`TASK-PROCESS.md`](./qa/TASK-PROCESS.md) | Failure-mode-first CUA task authoring process, gated on the QA audit. Infrastructure layer (local docker-compose, ports, Vite proxy) — principles live in the mirror below. |
| [`complex-task-authoring.md`](./qa/complex-task-authoring.md) | How to grow a task set to cover the full shipped surface from a feature inventory. Workflow layer — principles live in the mirror below. |
| [`mirrors/cua-clone-apps-taskgen.md`](./qa/mirrors/cua-clone-apps-taskgen.md) | **Mirror** of the canonical `cua-clone-apps-taskgen` skill from `vibe-rl-gym` branch `tasks/clone-apps`. Universal CUA task-gen principles (difficulty taxonomy, failure triage, calibration anti-patterns, 30-rule audit, GUI-only mandate). Check vibe-rl-gym for updates before authoring. |
| [`clone-status.md`](./qa/clone-status.md) | Live status matrix for every clone in the pipeline (audit, fix, tasks). |
| [`spotify-readiness.md`](./qa/spotify-readiness.md) | Temporary onboarding memo for the Spotify clone — delete once Spotify completes the pipeline. |
