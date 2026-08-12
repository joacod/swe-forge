# Isolated Execution Workflow

Use this workflow only after the general ticket workflow has selected
`execution_mode: ISOLATED` and `.swe-forge/policies/provider-selection.md` has
selected or rejected an execution provider. `ISOLATED` is a portable workflow
shape, not a vendor or harness. The root orchestrator remains accountable for
integration, verification, review, delivery, and final acceptance.

The v1 composition is `parallel_strategy: COMPOSE`: several non-overlapping
worker results contribute to one integrated result. The integration strategy
is `integration_strategy: CHERRY_PICK`, used as a behavioral description of
applying worker transfer commits or equivalent patches in planned order. This
workflow does not compare alternative implementations, select a best result,
create stacked PRs, create worker PRs, or run a hosted scheduler.

## One Integration and Delivery Branch

The invariant for an isolated ticket is:

> One integration and delivery branch for the entire ticket.

The workflow must:

- leave the user's original checkout untouched
- create one dedicated integration worktree
- create or reuse one safe non-protected integration/delivery branch
- give the integration worktree exclusively to the orchestrator
- allow bounded ephemeral local worker branches and worktrees
- never push worker branches
- never create worker PRs
- push only the integration branch
- create exactly one final PR for the ticket
- never merge automatically

Use clear namespaced branch and worktree names containing the run ID and task
ID, for example:

```text
swe-forge/<run-id>/integration
swe-forge/<run-id>/worker/<task-id>
<temp-root>/swe-forge/<run-id>/integration
<temp-root>/swe-forge/<run-id>/worker/<task-id>
```

The integration/delivery branch is the branch that receives final
repository-appropriate commits, is pushed, and is used for the one PR. An
`ephemeral worker branch` is local-only and carries a worker-local transfer
commit. An `integration worktree` is exclusively orchestrator-owned. A `worker
worktree` is exclusively owned by one bounded worker. No worker resource is a
second delivery boundary.

For `SOLO` and `SUBAGENTS`, the normal ticket workflow's one dedicated task or
delivery branch remains unchanged. Do not create isolated resources merely to
make a sequential ticket appear parallel.

## Foundation Phase

Before parallel writable work, identify and complete any shared foundation:

- interfaces
- contracts
- shared types
- schema decisions
- common configuration
- fixtures
- architectural boundaries
- dependency changes

The orchestrator integrates and validates the foundation in the integration
worktree before creating dependent worker worktrees. A shared schema,
migration, contract, architecture decision, root lockfile, generated artifact,
or unsettled ownership boundary is a reason to serialize the affected work or
stay with `SOLO`/`SUBAGENTS`, not to launch concurrent writers.

## Task DAG and Waves

Represent isolated tasks as a dependency DAG. Every task plan records at least:

```yaml
task_id: <stable run-local task identifier>
objective: <one observable objective>
dependencies: []
allowed_scope: []
forbidden_scope: []
shared_artifacts: []
acceptance: []
validation: []
risk: low | medium | high | critical
base_sha: <exact integration commit>
wave: <integer>
integration_order: <planned integer>
```

Create worker worktrees only when their task becomes ready. All workers in one
wave start from the same recorded integration `HEAD` (`base_sha`). For v1, use
wave barriers:

1. launch all ready workers in the current wave
2. wait for every worker in that wave to settle
3. collect and verify every result
4. integrate accepted results in planned order
5. run wave-level validation
6. launch the next wave only after the current wave is integrated

Default to at most two concurrent writable workers. A higher limit requires an
explicit recorded user preference and a justification that covers resource
isolation, result collection, and integration capacity. Completion order never
determines integration order; dependencies and the recorded plan do.

A task may be in an isolated topology while some waves are sequential. The
mode authorizes bounded isolated writable workers where useful; it does not
require parallelism at every lifecycle stage.

## Worker Ownership

Every writable worker receives:

- one dedicated local branch
- one dedicated worktree
- one exact `base_sha`
- one bounded task contract
- no access to the integration checkout
- no authority to push, create a PR, merge, publish, deploy, fetch or rebase
  shared branches, delete branches, create additional worktrees, or delegate
  recursively unless separately authorized

The task contract must distinguish the integration/delivery branch from the
worker branch, the integration worktree from the worker worktree, and
worker-local transfer commits from final integration commits. The orchestrator
creates and classifies worker resources; workers do not create more resources.

Worktrees isolate checked-out files but not all Git refs or external runtime
resources. Keep Git and delivery permissions explicit. A worker must not infer
that a local commit permits a push, PR, merge, publication, deployment, or
shared-environment effect.

## Worker Result and Eligibility

A writable worker returns a structured result containing at least:

```yaml
task_id: <task identifier>
status: DONE | BLOCKED | FAILED
base_sha: <recorded worker base>
head_sha: <worker head>
deliverable_commits: []
files_changed: []
validation: []
scope_exceptions: []
staged_changes: []
unstaged_changes: []
untracked_changes: []
environment_resources:
  setup_commands: []
  copied_ignored_files: []
  ports: []
  databases: []
  docker_projects: []
  temporary_directories: []
  external_resources: []
  cleanup_commands: []
```

A writable result is eligible for integration only when:

- branch and worktree identities match run state
- it started from the expected `base_sha`
- its checkout is clean
- every change is represented by a declared deliverable commit
- touched files fit the task contract
- no unexplained untracked files remain
- required worker-level validation passed
- no forbidden delivery action occurred

Agent lifecycle status alone is never sufficient. A worker that is blocked or
failed remains preserved for inspection, retry, serialization, or safe cleanup.

## Commit Construction and Central Integration

Use worker commits as local transfer artifacts. Do not blindly merge worker
branches or copy entire worktrees into the integration checkout.

For each deliverable integration unit:

1. inspect the source commit and task result
2. verify its scope and exact base
3. record a clean integration checkpoint
4. apply the source commit's changes to the integration checkout without
   immediately finalizing the integration commit
5. never resolve a conflict silently
6. run required integrated-state validation
7. create the final repository-appropriate integration commit only after
   validation passes
8. record the source-commit to integration-commit mapping
9. continue in the planned `integration_order`

A Git implementation may use `cherry-pick --no-commit` followed by validation
and a final commit, but the canonical rule is behavioral rather than tied to
one command. Do not automatically rewrite or squash final integration history
after validation. Review repairs normally become explicit cohesive repair
commits.

A conflict between tasks classified as independent is evidence that the
decomposition may be wrong. On conflict:

- stop the operation safely
- preserve the worker branch and worktree
- restore the integration worktree to its recorded clean checkpoint using the
  safest available Git operation
- re-evaluate ownership and dependencies
- serialize or recreate the affected task from the current integration head
- rerun affected validation
- never use force cleanup or destructive recovery against ambiguous state

The integration branch is authoritative. Worker summaries, provider lifecycle
states, and passing worker tests do not replace integrated verification.

## GUIDED Behavior

For an explicit `isolated` invocation, the token authorizes the bounded local
integration worktree, planned worker branches/worktrees, and worker-local
transfer commits. It does not authorize integration-branch commits, pushes,
PRs, or merges.

When `AUTO` selects `ISOLATED` under `GUIDED`, present one setup checkpoint
before creating multiple worker resources. Show:

- worker count
- current wave
- task ownership
- selected provider
- worktree plan
- integration order
- shared artifacts and their owners
- environment resources and isolation plan

The user's `continue` authorizes only that planned local setup. When one worker
result is ready for integration:

- show its proposed diff boundary and evidence
- wait for `go`
- apply and validate the integration unit
- create the final local integration commit only after validation passes
- continue to the next integration unit

Keep `go` as authorization for a commit on the actual integration/delivery
branch. Do not infer push, PR, or merge authorization from `continue` or `go`.

## PR Behavior

An explicit `PR` delivery request authorizes:

- the bounded run-owned integration branch/worktree
- planned local worker branches/worktrees
- worker-local transfer commits
- validated integration commits
- the final integration-branch push
- creation of one final PR

It never authorizes:

- worker branch pushes
- worker PRs
- publication or deployment
- merge

PR mode still requires worker-level validation, integrated validation after every
integration unit, wave-level validation, complete applicable repository checks,
fresh independent review, repair validation, and final comparison with the
original ticket before push or PR creation.

## Environment Isolation

Each isolated plan and task contract includes an environment-isolation section:

```yaml
environment_isolation:
  setup_commands: []
  copied_ignored_files: []
  ports: []
  databases: []
  docker_projects: []
  temporary_directories: []
  external_resources: []
  cleanup_commands: []
```

Rules:

- copy ignored files only from an explicit allowlist
- never copy arbitrary secrets or every ignored file
- allocate unique ports, database names, Docker project names, and temporary
  paths
- inspect setup commands for side effects before execution
- serialize execution when safe environment isolation is unavailable
- treat migrations and shared persistent environments as separately authorized
  effects
- record setup, resources, and cleanup evidence in worker results and run state

Worktrees do not isolate shared databases, Docker projects, ports, external
services, Git refs, credentials, or other mutable resources by themselves.

## Shared Artifacts

Every shared artifact has one explicit owner before writable work begins. This
includes, for example:

- root lockfiles
- shared type indexes
- generated API clients
- schemas and snapshots
- migration registries
- root exports
- changelogs
- version files

Prefer package-local worker ownership. Keep shared generated artifacts with the
orchestrator or one explicitly assigned task and integrate them centrally.
Several workers must never independently modify a root lockfile or shared
generated output.

## Verification and Review

Require all of the following:

- worker-level targeted validation before a result is accepted
- integrated-state validation after each integration unit
- wave-level validation after each wave
- complete applicable repository checks after all integration
- fresh independent review of the integrated final diff
- repair validation for every relevant finding
- final comparison against the original ticket and acceptance criteria

The fresh reviewer receives the original ticket, acceptance criteria,
architecture decisions, final integrated diff, and validation evidence. It does
not rely on provider lifecycle state or worker summaries as acceptance proof.

## Cleanup

After final acceptance and PR creation:

- verify every accepted source commit has an integration mapping
- verify every worker worktree is clean
- remove only run-owned clean worktrees
- never use forced removal automatically
- delete integrated worker branches only with safe deletion
- remember that removing a Herdr worktree does not delete its branch
- preserve and report dirty, blocked, or unresolved resources
- keep the integration branch for the PR
- record all remaining worktrees, branches, processes, and environment resources

If a worker checkout is dirty or its changes are not proven integrated or
preserved externally, leave it in place and report it. Never use `git worktree
remove --force`, `git clean -fd`, or equivalent destructive cleanup against
ambiguous state.

## Recovery

A resumed orchestrator reconstructs actual repository and provider state before
continuing. Run state preserves at least:

```yaml
execution_provider: NATIVE | HERDR | NONE
parallel_strategy: NONE | COMPOSE
integration_strategy: NONE | CHERRY_PICK
current_wave: <wave>

integration:
  path: <absolute integration worktree path>
  branch: <integration/delivery branch>
  base_sha: <ticket base>
  head_sha: <current integration head>
  checkpoint_sha: <last clean checkpoint>
  status: ready | running | blocked | complete | dirty

workers:
  <task_id>:
    provider_id: <provider worker identity>
    path: <absolute worker worktree path>
    branch: <ephemeral local worker branch>
    base_sha: <worker base>
    head_sha: <worker head>
    source_commits: []
    integrated_commits: []
    status: ready | running | done | blocked | failed | dirty | cleaned
    validation_ref: <result or external evidence>
    cleanup_status: pending | clean | blocked | preserved

environment_resources:
  setup_commands: []
  copied_ignored_files: []
  ports: []
  databases: []
  docker_projects: []
  temporary_directories: []
  external_resources: []
  cleanup:
    status: pending | complete | incomplete
    commands: []
```

Recovery must inspect actual Git worktree, branch, checkout, provider, and
process state before continuing. Stale run state never overrides repository
evidence. If provider state is unavailable, use Git evidence and structured
results where safe; otherwise block rather than assume a worker settled.
