# github-offload — sacrificial-repo trial script

This repo is the **tier-3 live trial** for the `github-offload` skill (see its spec's
"Validation before promotion" gate). It has a dispatch-only CI workflow (`.github/workflows/ci.yml`)
that accepts `commit` + `nonce` and a trivial breakable test (`test/sum.test.mjs`, oracle for
`src/sum.mjs`).

> Prereq: the `github-offload` skill must be BUILT (its plan executed). Invoke it by path until it is
> promoted. Replace `<offload>` below with `node /path/to/github-offload/bin/offload.mjs`.

## 0. Baseline (green)
- `node --test` locally → passes.
- Push `main`, dispatch once manually to confirm the workflow is green:
  `gh workflow run ci.yml -f commit=$(git rev-parse HEAD) -f nonce=baseline` → `gh run watch`.

## 1. Fixable red — DETACHED mode
1. Break the code: in `src/sum.mjs` change `return a + b;` → `return a + b + 1;`. Commit locally (do NOT push).
2. `<offload> detached` → it should: precheck (local `node --test` fails fast → it must NOT offload a
   known-bad tree; so first revert the break OR rely on the loop). For a CLEAN detached test, instead
   break it in a way local precheck passes but CI fails (e.g. an OS/CI-only assertion) — OR set
   `local_precheck.tests=false` for this run so the red reaches CI.
3. Expect: dispatch → nonce-resolve → CI red → isolated-worktree `claude -p` fix → re-dispatch → green → toast.
4. Verify: `git log` shows a `[offload-autofix]` commit; no orphaned worktrees (`git worktree list`);
   `.git/offload.lock` gone; `.git/offload-state.json` gone.

## 2. Fixable red — SYNC mode
1. Re-break `src/sum.mjs`, commit.
2. `<offload> sync` → prints `OFFLOAD_DISPATCHED runId=<> nonce=<>`. Register a background task running
   `<offload> result <runId>`.
3. On `OFFLOAD_RED` + printed log: fix `src/sum.mjs` yourself, then re-run `<offload> sync`.
4. Expect eventual `OFFLOAD_GREEN`; lock released. Confirm the sync→sync re-dispatch did NOT deadlock.

## 3. Escalation / unfixable
1. Make the oracle impossible: in `test/sum.test.mjs` add `assert.equal(sum(2,2), 5);`. Commit.
2. `<offload> detached`. Expect: N=3 attempts exhausted → `CI-FAILURE-REPORT.md` written + escalation toast.
3. Revert the impossible assertion afterward.

## 4. Lock-rejection
1. Start `<offload> sync` (acquires awaiting-task lock), then immediately `<offload> detached` on the
   same branch. Expect the detached start to be REJECTED (lock held). Clean up the lock after.

## 5. Budget-timeout
1. Set `budget_minutes` very low (e.g. add a slow `sleep` step to `ci.yml`) and dispatch.
2. Expect `OFFLOAD_TIMEOUT` / "time budget (watch stalled)" escalation + lock release; no hung worker.

## Teardown
- Reset `src/sum.mjs` / `test/sum.test.mjs` to baseline.
- `git worktree prune`; ensure no `offload-*` worktrees, no `.git/offload.lock`, no `.git/offload-state.json`.
