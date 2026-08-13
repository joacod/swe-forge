# General Ticket Workflow

This is the operational workflow for a general software ticket. Read it only
after the user explicitly invokes SWE Forge.

## Inputs

The workflow accepts:

- the original ticket or problem description
- explicit user constraints
- repository instructions and available tooling
- optional harness, model, execution-provider, or isolation preferences

The original ticket remains authoritative. Do not silently replace it with a
worker's interpretation.

## Artifact Rule

Use the smallest amount of persistent state that preserves correctness.

For `SOLO`, planning and results may remain in the active context unless the
ticket benefits from a written artifact. For delegated work, create bounded
task packages using `.swe-forge/contracts/task.md` and consume structured
results using `.swe-forge/contracts/result.md`. For independent review, use
`.swe-forge/contracts/review.md`.

Keep temporary run state outside the repository or under an ignored
`.swe-forge/runs/` directory. Do not commit transcripts, generated logs,
credentials, or ticket-specific state.

Before writing repository-local state, verify the exact path is ignored, for
example with `git check-ignore`. If it is not ignored, use a permission-
restricted external temporary directory or stop for explicit setup; do not
silently modify the repository's ignore rules. Clean external state at run
completion and report any cleanup failure.

## Procedure

### 1. Ingest

Read the ticket without designing the solution immediately. Preserve the raw
invocation arguments as the immutable ticket input, including reserved command
tokens before parsing. Record the parsed remainder separately; the remainder
must not replace the original input.

For harness commands, parse the raw arguments before ingesting the ticket:

- inspect the first token: if it is lowercase `solo`, `subagents`, or
  `isolated`, record `requested_mode` and remove it as the explicit topology
- inspect the first remaining token (or the original first token): if it is
  lowercase `guided` or `pr`, record `requested_delivery` and remove it as the
  delivery token; this supports either `solo pr <ticket>`, `isolated pr
  <ticket>`, or `pr isolated <ticket>`
- if a delivery token was consumed before a topology token, inspect the next
  token for lowercase `solo`, `subagents`, or `isolated` and record it as the
  explicit topology
- if the first token is lowercase `herdr`, do not record a Herdr topology and
  do not silently treat it as a ticket. Return clear migration guidance:
  "The `herdr` topology token was removed. Use `isolated` and request Herdr as
  an execution-provider preference if it is wanted." Ask the user to resubmit
  the corrected invocation, while preserving the original raw arguments in run
  state.
- record a separate `requested_provider` when the user explicitly asks for
  `NATIVE`, `HERDR`, or `NONE` as an execution-provider preference. Provider
  preference is a natural-language decision (for example, "use Herdr as the
  provider for isolated execution") rather than a topology token; a harness
  may expose a separate provider-preference field only when it documents that
  syntax. Provider preference never changes `requested_mode` and the word
  `herdr` is not a topology alias
- if no delivery token is consumed, record `requested_delivery: DEFAULT` and
  resolve `delivery_mode: GUIDED`
- if no topology token is consumed, record `requested_mode: AUTO`
- preserve the non-empty remainder as the parsed ticket while retaining the
  complete raw invocation as the original ticket reference
- preserve any user-supplied specialist-skill names, paths, or URLs as ticket
  input; do not treat them as permission to install or execute external code
- a topology or delivery token without a ticket is incomplete input; ask for the
  missing ticket
- if the first token is not one of the reserved lowercase tokens, preserve it
  as ticket text and record `requested_mode: AUTO`

The lowercase topology words remain reserved only in the canonical topology
position. The delivery shorthand is intentionally explicit: `pr` selects the
low-touch pull-request path, while `guided` makes the default visible. Natural
language activation without a command may state a mode or provider preference
directly. The supported explicit isolated forms are:

```text
/swe-forge isolated <ticket>
/swe-forge isolated pr <ticket>
/swe-forge pr isolated <ticket>
```

A natural-language request such as "use Herdr as the provider for this
isolated run" records `requested_provider: HERDR` without changing the
reserved topology grammar. Never advertise a removed provider name as an
execution mode. Migration
handling must point users to `isolated` and a separate Herdr provider
preference.

Record the requested behavior, explicit constraints, affected users or systems,
non-goals, and any requested validation. Preserve important wording from the
original ticket. Record whether the user wants review checkpoints or low-touch
PR delivery; do not treat a delivery preference as permission to merge. Preserve
context-management concerns as ticket constraints rather than assuming that a
model or harness will compact at the desired time.

### 2. Discover

Inspect the repository before making architectural claims. Locate relevant entry
points, dependencies, analogous implementations, conventions, documentation,
tests, and quality gates. If the ticket names an optional specialist skill, or
an already available skill has a clearly declared match, read
`.swe-forge/policies/specialist-skills.md` and evaluate it on demand; otherwise
do not search or load unrelated skills.

Use parallel read-only research only when it reduces time or context load. All
research must return evidence with file, symbol, command, or documentation
references.

Check available harness and provider capabilities without claiming them from
installation alone. In particular, an installed provider is not evidence that
it can safely create isolated writable worktrees, collect structured results,
or preserve central integration. For a context-risk ticket, inspect whether
the active host exposes usage telemetry, a known context window, proactive
compaction, overflow classification/retry, and a persistent session. Record
unknown capabilities explicitly; there is no universal cross-harness context
API.

### 3. Specify

Translate the ticket into observable acceptance criteria. Separate facts from
assumptions and identify compatibility constraints.

In `GUIDED`, ask only blocking questions and keep the plan in the active
context unless a durable run artifact is needed. In `PR`, follow
`.swe-forge/policies/specification.md`: inspect repository facts first, run at
most a short high-leverage interview when the ticket is underspecified, and
build the transient artifact described by
`.swe-forge/contracts/working-spec.md`. Do not write ticket-specific specs to
the repository. When a specialist skill is considered, the working spec records
its source, selection status, and reason. For long-running or context-risk work,
the spec also records the safe pre-continuation compaction action, overflow
recovery, and external durable-state reference. A reasonable, low-risk
assumption may be recorded and used; a blocking user decision must be asked
rather than guessed.

### 4. Architect

Choose the smallest compatible implementation approach. Identify impacted
components, interfaces, data flow, migration or compatibility concerns, and
risks.

Do not edit code during architecture analysis. Do not introduce an abstraction
unless the ticket and repository evidence justify it. If isolated execution is
being considered, identify the shared foundation, stable interfaces, task
ownership, shared-artifact owners, environment resources, and integration order
before creating workers.

### 5. Decompose

Create bounded tasks only where decomposition provides useful independence.
Each writable task must state its objective, reason, dependencies, allowed
scope, forbidden scope, acceptance criteria, validation, risk, and expected
result. For `ISOLATED`, each task additionally records `shared_artifacts`,
`base_sha`, `wave`, and `integration_order` as required by
`.swe-forge/workflows/isolated-execution.md`.

For `GUIDED`, also divide broad work into cohesive review slices with a small
observable boundary and an explicit checkpoint. For `PR`, the transient working
spec must include an ordered commit plan even when execution is `SOLO`. Each
step owns a cohesive observable boundary, scope, dependencies, targeted
validation, and commit subject. Keep steps large enough to avoid ceremonial
commits but small enough that one validated step can be reviewed independently.

Parallelize only when dependencies are satisfied, ownership is non-overlapping,
and outputs can be independently evaluated. Otherwise use sequential waves or
`SOLO`. A shared schema, migration, contract, architecture decision, root
lockfile, or generated artifact with unsettled ownership requires foundation
work first and may require serialization.

### 6. Route

Record exactly one execution topology, one provider decision where relevant,
and one delivery mode with their reasons:

```text
requested_mode: AUTO | SOLO | SUBAGENTS | ISOLATED
execution_mode: SOLO | SUBAGENTS | ISOLATED
requested_provider: AUTO | NATIVE | HERDR | NONE
execution_provider: NATIVE | HERDR | NONE
provider_reason: <why this provider satisfies the isolated-execution requirements>
parallel_strategy: NONE | COMPOSE
integration_strategy: NONE | CHERRY_PICK
requested_delivery: DEFAULT | GUIDED | PR
delivery_mode: GUIDED | PR
reason: <why this is the smallest useful topology>
fallback_used: no | <requested mode/provider -> selected mode/provider and reason>
```

Use `SOLO` for small, tightly coupled, or inherently sequential work. Use
`SUBAGENTS` for useful native parallel read-only work or sequential bounded
writable delegation in one checkout. Use `ISOLATED` only when concurrent
writable work needs separate execution environments and the full automatic
gate in `.swe-forge/policies/execution-routing.md` passes, or when the user
explicitly requests it and safe isolation is available.

Any concurrent writable subagents using separate worktrees are `ISOLATED`,
even when the current harness provides those worktrees natively. Strong context
isolation alone does not justify `ISOLATED`; difficulty, file count, or the
presence of Herdr alone does not justify it.

When `execution_mode` is `ISOLATED`, load
`.swe-forge/policies/provider-selection.md`, select `NATIVE` or `HERDR` only
when its capabilities are demonstrated, and record `provider_reason`.
`parallel_strategy` must be `COMPOSE` and `integration_strategy` must be
`CHERRY_PICK`. If neither provider can supply required isolation, fall back to
sequential `SUBAGENTS` or `SOLO` when safe, or return `BLOCKED` when required
isolation would be lost. A non-isolated run records `execution_provider: NONE`,
`parallel_strategy: NONE`, and `integration_strategy: NONE`.

Never choose a mode merely because the task is difficult or a tool is
available. For `AUTO`, record why all ten isolated-routing conditions passed or
which condition caused serialization. An explicit mode bypasses topology
preference but not safety, provider capability, validation, scope, or delivery
authorization.

### 7. Test Strategy

Before implementation, identify the observable behavior and public seam that
will provide confidence. Record a concise testing decision for every ticket,
even when the result is that no automated test is applicable:

- `behavior`: the changed user- or caller-observable behavior
- `seam`: the public interface or observable boundary under test, or `none`
- `existing_coverage`: relevant tests already present, or `none found`
- `approach`: `regression`, `acceptance`, `characterization`,
  `existing-sufficient`, `manual`, or `not-applicable`
- `development_mode`: `test-first`, `test-after`, or `not-applicable`
- `rationale`: why this is the smallest useful evidence

Select validation proportional to risk and behavior:

- reproduce a bug and add a regression test first when practical
- use test-first development when it provides useful feedback or design signal
- establish a green baseline before behavior-preserving refactors
- use characterization tests when existing behavior needs protection
- use targeted tests at public seams for new or changed behavior
- use focused manual or reproduction evidence when automation is unavailable
  or not justified
- avoid ceremonial tests for changes with no meaningful test surface

Existing tests can be sufficient; no blanket coverage target is required. A
behavior change without an automated test needs an executed manual or
reproduction check and an explicit residual-risk note. A test plan alone is not
validation. When test-first is selected, work in vertical red-green-refactor
slices rather than writing a speculative test suite upfront.

Record what will be run before implementation when the task is delegated.
When `.swe-forge/tools/swe-forge-gate` is available, register the expected
checks with `plan-check`, then use `validate` or `record-check-status` for
preflight, each current slice, and current-HEAD final checks; keep that ledger
outside the repository or under an already ignored path. Mark slice-local
checks with `--final-required false` and register final checks separately.
Classify each check as `required`, `conditional`, or `informational`; every
conditional check must include its observable condition. Mark slice-local
checks with `--final-required false` and final checks with the default
`--final-required true`. Use targeted checks for each slice and batch independent
final checks when the repository provides an inspected runner; batching must
preserve per-check results and fail when a required check fails. Do not use
batching to bypass current-candidate fingerprint binding. Validation,
checkpoint, and commit evidence is bound to the exact candidate fingerprint.
Inspect commands
before execution for filesystem mutation, credentials, networking, migrations,
deployment, publication, production access, or shared-environment effects.
Classify delivery commands separately: local commit, branch push, PR creation,
and post-merge sync. A normal guided invocation authorizes local validation and
one safe task-branch setup from a clean protected default branch, but not
delivery. `go` authorizes the current guided slice's local commit; `PR` mode
authorizes per-slice commits, the final integration-branch push, and one PR
after their applicable gates. Merge always needs a separate instruction.

For `ISOLATED`, add environment isolation to the plan and task contracts:

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

Copy ignored files only from an explicit allowlist, allocate unique resources,
inspect setup side effects, and serialize when safe resource isolation is not
available. Migrations and shared persistent environments require separate
authorization.

### Context continuity gate

For a long-running or context-risk ticket, load and follow
`.swe-forge/policies/context.md`. A `near-limit` signal is handled before the
next meaningful continuation: stop at a safe turn/slice boundary, persist the
external working spec and run state, invoke the host-native or adapter-provided
compaction, wait for it to settle, then re-read state and inspect the current
Git `HEAD` and diff before resuming. Do not use a guessed token percentage when
the host exposes a remaining-budget signal, and do not compact during an
ambiguous mutation.

An `overflow` response is not a Forge task retry. If the host documents
compact-and-retry, wait for that lifecycle and verify its result before
continuing. Otherwise persist state and block for a manual compact or fresh
session. Never repeat the last write, commit, or validation command merely
because a compacted summary omitted it.

### 8. Implement

Execute dependency waves while preserving bounded scope. A worker owns only the
task it received and must report scope expansion or blocking issues
immediately. In `GUIDED`, complete and validate one review slice at a time,
then stop at a checkpoint with the diff boundary and next slice. Resume after
`continue` or a revision; `go` (or `commit and continue`) first creates a local
commit for the reviewed slice, then resumes. In `PR`, finalize the first
commit-plan step only after its targeted checks pass, create exactly that
step's local commit, and then begin the next step. Keep the planned history
separate; do not defer all commits until the end or collapse multiple steps
into one catch-all commit. Refresh the short working-spec and run-state
checkpoint after each validated step and before a context-triggered
compaction. Stop only for a blocking decision or failed gate.

Two writing workers must never edit the same checkout concurrently. Read-only
workers may inspect the integration checkout. `ISOLATED` writable workers each
receive a dedicated worktree and local branch from the exact recorded
integration `HEAD`; they cannot access the integration checkout. The
integration worktree belongs exclusively to the orchestrator.

Before the first edit, confirm that writable work is on a dedicated,
non-protected branch or worktree. Protected branches include repository-declared
protected branches, the locally known remote default branch, `main`, and
`master`. From a clean protected default, automatically create and record one
safe non-protected task/delivery branch for `SOLO` or `SUBAGENTS`. For
`ISOLATED`, the orchestrator creates one run-owned integration worktree and one
integration/delivery branch, then creates bounded worker resources only as
ready waves permit. Leave the user's original checkout untouched.

Do not write when the relevant checkout is dirty, detached, or cannot be
classified safely. Stop and ask the user to resolve those conditions rather
than moving or overwriting work. Record a pre-edit baseline with the absolute
checkout path, HEAD, branch, remote-default evidence, branch/worktree setup,
and staged, unstaged, and untracked files. If the request for additional
branches or worktrees is ambiguous, ask before creating them.

Workers must run assigned validation and return a structured result. They must
not claim success from code inspection alone. A writable isolated result is
eligible for integration only when branch/worktree identity, exact base,
cleanliness, declared commits, scope, untracked state, worker validation, and
forbidden delivery actions all pass the checks in the isolated workflow.

### 9. Integrate

The orchestrator owns integration. Review each result against its task contract
before combining it with other work. Preserve the checkpoint boundary in
`GUIDED`; the user reviews the integrated slice before the next writable wave.
For isolated worktrees, integrate accepted results centrally and sequentially in
recorded `integration_order`, not completion order.

For every isolated integration unit, inspect the source commit and result,
verify scope and base, record a clean checkpoint, apply changes without
immediately finalizing the integration commit, run integrated validation, then
create the final repository-appropriate commit and record the
source-to-integration commit mapping. Do not blindly merge branches or copy
entire worktrees. Do not resolve conflicts silently.

A conflict between supposedly independent tasks requires stopping safely,
preserving worker resources, restoring the integration worktree to its recorded
clean checkpoint with a safe operation, re-evaluating ownership and
 dependencies, and serializing or recreating the affected task. Never force
cleanup against ambiguous state.

### 10. Verify

Run the relevant repository quality gates after integration. When using the
executable evidence gate, mark every required or applicable conditional final
check with `--final` against the final HEAD. In `PR` mode, each slice or
integration unit's required targeted checks must pass before its local
integration commit, and final verification and fresh review must pass before
push or PR creation. Run `deliver-pr` before external push or PR actions when
the executable gate is available. In `GUIDED`, a checkpoint may report a passing
slice while final acceptance remains pending. If context recovery occurred,
final checks and fresh review must bind to the post-recovery `HEAD`. Checks may
include targeted
tests, the complete test suite, typecheck, lint, build, static analysis,
packaging, or repository-specific structural and installer checks.

Report every check as passed, failed, skipped, or unavailable. Explain why a
check was not applicable or could not run. Every required check must pass. A
conditional check must pass when its condition applies or have a recorded
evidence-backed determination that it does not apply. Informational checks
never substitute for required evidence. Changing or substituting a delegated
check requires a revised task contract.

For `ISOLATED`, require worker-level targeted validation, integrated-state
validation after each integration unit, wave-level validation after each wave,
complete applicable repository checks after all integration, and evidence that
the final integration commits were built centrally. Use the fixed result bundle
and canonical isolated Git/evidence guard; provider completion alone is never
eligibility evidence.

### 11. Review

Use a fresh context for independent review whenever implementation was
delegated, the change spans components, risk is medium or higher, or security,
data integrity, compatibility, concurrency, or external effects are relevant.
For a trivial localized `SOLO` change, the orchestrator may perform final diff
review in the active context and record `review: skipped` with the reason.
Provide the original ticket, acceptance criteria, architecture decisions, final
diff, and validation evidence. Do not provide the implementer's entire
conversational history.

Review correctness, missing requirements, regressions, abstractions, scope,
error handling, compatibility, concurrency, security, performance, tests, and
unrelated changes. For isolated work also review provider boundaries, exact
base SHAs, worker scope, shared-artifact ownership, environment isolation,
integration order, source-to-integration mappings, and conservative cleanup.
Return findings using `.swe-forge/contracts/review.md`.

Apply the blocking matrix in `.swe-forge/contracts/review.md`. Low-confidence
stylistic opinions do not block completion by themselves.

### 12. Repair

Repair relevant findings within the original scope. Re-run affected tests and
quality gates. Escalate to a debugger only when root cause is uncertain or a
failure remains unexplained.

Limit review and repair cycles. If a finding cannot be safely resolved, report
the evidence, impact, and remaining risk instead of looping indefinitely.
Repairs to an isolated integration branch normally become explicit cohesive
repair commits; do not rewrite accepted integration history automatically.

### 13. Final Acceptance

Compare the final integrated diff to the original ticket, acceptance criteria,
and explicit constraints. Check for missing functionality, accidental changes,
scope creep, unresolved failures, and unreviewed generated files.

Success requires the acceptance gate in `SWE-FORGE.md`. For an isolated ticket,
verify that the integration/delivery branch is the only published branch, every
accepted source commit has an integration mapping, worker branches remain local
and safe, and exactly one final PR is planned or created. Do not substitute a
worker's summary, provider lifecycle status, or passing worker tests for final
inspection and integrated verification.

Map the run to `ACCEPTED` only when the gate passes, `BLOCKED` when a decision,
authorization, access, or environment change can enable safe continuation, and
`FAILED` when attempted work remains incorrect or the gate cannot be met within
the ticket and recovery limits.

### 14. Report

Return only the decision-relevant result:

- final status: `ACCEPTED`, `BLOCKED`, or `FAILED`
- requested and selected execution topology
- requested and selected provider when `ISOLATED`, including reason and any
  fallback
- requested and selected delivery mode
- implementation approach and important decisions
- context capability/status, compaction or overflow recovery evidence, and
  durable-state/Git recheck result
- files changed
- tests and other validation with results
- independent review status
- assumptions
- remaining risks or follow-ups
- delivery result (checkpoint, commits, push, PR URL, or explicit blocked or
  not-authorized status)
- receipt result or explicit not-generated status
- cleanup status and remaining resources when applicable

Do not include internal worker transcripts.

Normal `GUIDED` completion stops with the reviewed diff and validation evidence
for human approval. The user can say `go` at a checkpoint to commit that slice
and continue, or use the separate `git-commit`, `git-push`, and `git-pr` actions.
`PR` completion may create separate local slice commits, then push the one
integration/delivery branch and create one PR after the final quality gates and
review. It never authorizes merge. After a human merge, the user can say
`merged` or invoke `git-sync`; the sync action must verify the PR state before
switching and fast-forwarding the default branch.

## Blocking and Recovery

When a worker is `BLOCKED` or `FAILED`, the orchestrator should preserve the
task graph and choose the smallest recovery action:

1. supply missing context or repository access
2. clarify the task contract and retry once
3. run a focused debugger investigation
4. serialize work that exposed an ownership, environment, or ordering conflict
5. reduce the task scope to the smallest safe unit
6. change provider or topology when the required safety properties remain
   intact
7. escalate capability or assign the work to the orchestrator
8. stop and report the unresolved failure when safe progress is not possible

Do not hide a failure by changing the status to `DONE`. For isolated recovery,
inspect actual Git worktree, branch, checkout, provider, and process state;
stale run state never overrides repository evidence. Preserve dirty or
ambiguous worker resources rather than force-removing them.

Track retries in temporary run state. Do not retry indefinitely or conceal a
failure in the final report.
