# Delivery and Human-Control Policy

This file is the sole canonical owner of delivery and local-resource
authorization. Other workflow, contract, adapter, example, and documentation
files summarize or reference these rules; they must not redefine them.

## Delivery modes

`GUIDED` preserves human checkpoints. An explicit `isolated` token selects the
requested topology but does not authorize concrete branches, worktrees,
workers, processes, ports, databases, or other resources before they are
planned.

For every guided isolated run, whether explicitly selected or selected through
`AUTO`:

1. Create the isolated plan without creating multiple writable worker
   resources.
2. Present one setup checkpoint containing the integration branch and worktree,
   provider and capability evidence, worker count, worker branches and
   worktrees, current wave, task ownership, shared-artifact ownership, exact
   worker base SHA, integration order, runtime resources, and cleanup plan.
3. `continue` authorizes only that exact local setup.
4. Any material setup change requires another checkpoint.
5. `go` authorizes one reviewed, validated commit on the integration/delivery
   branch.
6. Neither `continue` nor `go` authorizes push, PR creation, publication,
   deployment, or merge.

For normal guided runs, safe setup of one dedicated task branch from a clean
protected default is workflow setup, not delivery authorization. PR mode keeps
per-slice commits separate for reviewability. A normal invocation may implement and validate on that branch, then stops for the
appropriate checkpoint. A dirty, detached, protected, or ambiguous checkout
is preserved and reported rather than reset, stashed, cleaned, or overwritten.

`PR` is the explicit low-touch path. The explicit `PR` token authorizes the
bounded local setup recorded in the accepted plan, worker-local transfer
commits, validated central integration commits, one final integration/delivery
branch push, and one final PR. It never authorizes worker branch pushes, worker
PRs, publication, deployment, force-push, or merge. Publication and merge
remain separate human actions.

### PR commit plan

Before the first edit, a `PR` working spec records an ordered commit plan. Each
step has one cohesive objective, owned paths, dependencies, targeted
validation, and a repository-appropriate commit subject. The orchestrator then
implements one step, runs that step's required checks, and creates its local
delivery commit before starting the next step. It must not accumulate all steps
and create one catch-all commit at the end.

A step may contain implementation and tests that are inseparable at the
observable boundary. Do not manufacture commits for unrelated formatting or
ceremonial phases: a one-step ticket correctly produces one commit. When the
plan has multiple meaningful steps, the PR history must contain one commit per
step; review repairs are additional atomic commits rather than a squash.

## Repository-aware delivery conventions

SWE Forge owns the workflow; the repository owns its delivery conventions.
Before creating a project-facing artifact, resolve the convention for that
artifact at the boundary where it will be created. Resolution is per artifact:
a branch rule does not automatically decide a commit or pull-request rule.
Discovered conventions are ephemeral. Do not create, require, or update a
`.swe-forge` configuration file, company profile, or other SWE Forge metadata in
the target repository.

Use this precedence and stop at the first confident result:

1. explicit instruction from the user or ticket
2. explicit repository documentation or instructions, including `AGENTS.md`,
   `CONTRIBUTING.md`, README/development documentation, and documented Git rules
3. repository-native configuration or templates, including Git configuration
   and pull-request templates
4. strong, recurring evidence from recent Git history
5. the existing SWE Forge default convention

Documented rules take precedence over inferred history. History is evidence, not
absolute authority: require a clear, repeated pattern before following it, and
use the existing Forge default when examples conflict, are sparse, or are too
weak to identify a format confidently. Keep any provenance in transient working
state or private evidence only; never persist discovered conventions as project
files or delivery metadata.

### Branch naming

Resolve branch naming only immediately before SWE Forge must create a task or
integration/delivery branch. Do not spend convention-resolution work on a run
that can safely reuse its existing branch. Prefer an explicitly documented
pattern, then a strong recurring branch-history pattern. Preserve a supplied
issue or ticket identifier when the repository convention calls for one.

When no repository convention can be identified confidently, retain the current
SWE Forge default:

```text
<type>/<short-kebab-case-description>
```

The resolved pattern may produce forms such as `feature/foo`, `feat/foo`,
`PROJ-123-short-description`, or `feature/PROJ-123-short-description`, but a
single example or an ambiguous prefix is not enough to replace the default.
Branch setup remains one atomic workflow setup action and still uses one
non-protected delivery branch.

### Commit messages

Resolve the commit convention immediately before each delivery commit,
including a review-repair commit. Prefer explicit repository instructions and
then a clear recurring history pattern. Use the result to adapt the existing
commit-generation behavior; do not rewrite existing history or split commits
just to match an inferred format. The message must still describe the actual
change and preserve the planned PR slice boundary.

When no convention is confidently identified, retain the existing SWE Forge
fallback: use a concise imperative subject, target 50 characters or fewer,
treat 72 characters as the hard maximum, omit terminal punctuation, and add a
short body only when motivation, compatibility, side effects, or a relevant
reference would otherwise be lost. Do not invent issue references or trailers.

### Pull-request composition and templates

Resolve the pull-request title/body convention immediately before composing a
pull request. When provider access is available, resolve the effective
repository template from the remote repository's default branch rather than
trusting the copy on the current feature branch. A read-only provider/API
lookup or a fetch of the default ref is preferred. If remote access is
unavailable, use a clearly sourced local/provider template only when its
provenance is known; otherwise retain the existing SWE Forge default body.

For GitHub repositories, normal template locations include:

```text
.github/pull_request_template.md
.github/PULL_REQUEST_TEMPLATE.md
PULL_REQUEST_TEMPLATE.md
docs/pull_request_template.md
.github/PULL_REQUEST_TEMPLATE/*
```

Provider adapters should resolve the default branch and read the selected
template at that ref, then map the resulting content into the provider's PR
creation API. They must not silently concatenate unrelated files from a
`PULL_REQUEST_TEMPLATE` directory or claim a feature-branch copy is current
when it was not retrieved from the remote/default branch.

When a repository template exists, preserve its headings, ordering, structure,
and checklists. Put generated summary, validation, implementation, and ticket
information into sections where it naturally belongs. Leave placeholders and
manual-confirmation questions intact, and do not invent answers to compliance,
security, release, or company-review questions. Do not replace the repository
template with SWE Forge's own structure. If no template exists, retain the
current default body from this policy.

### Draft pull requests

The atomic `create_pull_request` action accepts an optional standalone
lowercase `draft` argument. `/git-pr draft` requests a draft pull request and
uses the same convention and template resolution as a normal pull request. No
`draft` argument preserves the existing open/normal PR behavior. The argument
is an explicit per-action state, not a new workflow mode or a global default;
other future user-level preferences can be applied before this action without
changing the workflow. Draft creation still requires the current branch to be
pushed and does not implicitly commit, push, merge, or perform unrelated Git
operations.

Provider adapters own the provider-specific mapping: for example, a GitHub
adapter may use its remote API for default-branch template retrieval and map
`draft` to the provider's native draft flag. The canonical action remains
provider-neutral and exposes the semantic draft state only.

## Project-facing delivery artifacts

Branches, commits, pull-request titles, and pull-request bodies (PR
descriptions) are project-facing artifacts. They must read like normal
software-engineering work, regardless of the repository or the tool that
performed the run. Follow the
repository's existing conventions first; otherwise use this compact default
shape for a pull-request body:

```text
Summary:
- <what changed and why it matters>

Validation:
- <relevant checks actually run>

Notes:
- <only material risk, compatibility, rollout, or follow-up; omit when empty>
```

Keep the title concise and imperative. Keep the body focused on the outcome,
motivation, relevant behavior, reproducible project-level validation, and
material risks. If the repository provides a pull-request template, follow its
required sections without adding unrelated detail. Validation belongs in the
body only when it helps a project reviewer understand or reproduce confidence
in the change.

Never include a SWE Forge receipt, evidence fingerprint, run metadata, topology,
execution provider, harness, model, routing, context, internal path,
transcript, raw log, working-spec, implementation-diary, or other tool-process
detail in a project-facing pull request. Do not add tool or agent attribution,
generated-by trailers, or run identifiers to commit messages or branch names.
The same rule applies to SWE Forge's own pull requests; there is no internal
exception. Receipts remain private run-evidence artifacts and may be reported
separately when explicitly useful, but they are never PR content.

## One delivery boundary

A normal run uses one task/delivery branch. An isolated run uses one
integration/delivery branch. The integration branch/worktree identity belongs
in `delivery_checkout` and `integration` state, not duplicated in `delivery`.
Worker branches and worktrees are local-only transfer resources, never a
second delivery boundary, and cannot create PRs.

## Delivery branch naming

Name normal task/delivery branches and isolated integration/delivery branches
with the conventional form:

```text
<type>/<short-kebab-case-description>
```

Choose `<type>` from the primary ticket outcome, for example `feat`, `fix`,
`docs`, `refactor`, `test`, `chore`, `perf`, `build`, or `ci`. Keep the
description lowercase, concise, and separated with hyphens; include an issue
number only when the repository or ticket supplies one. Do not use the
repository/project name (for example `swe-forge/`) as a generic branch prefix.

If the preferred name is already occupied, retain the type and description and
add a short unique suffix (or use a supplied issue identifier); do not silently
reuse another task's branch. Namespaced `worker/` or run/task names are allowed
only for ephemeral local-only worker branches in `ISOLATED`, where uniqueness
and resource ownership matter. They are never delivery branches, pushed
branches, or PR branches.

## Atomic actions

Each action is independently authorized:

| Action | Permits | Never permits |
| --- | --- | --- |
| `worker_setup` | planned local isolated resources after `continue` or PR plan | integration commit, push, PR, publication, deployment, merge |
| `worker_transfer_commit` | local worker transfer commit in the accepted plan | central integration commit, push, PR, publication, deployment, merge |
| `commit` | one reviewed local delivery-branch commit (`go` or PR) | push, PR, publication, deployment, merge |
| `push` | one final integration/delivery branch push in PR mode | worker push, PR, publication, deployment, merge |
| `create_pull_request` | one final PR targeting the protected default | worker PR, merge, publication, deployment |
| `publish` | nothing unless separately authorized | tag/release publication is not part of this ticket |
| `deploy` | nothing unless separately authorized | production or shared-environment effects |
| `merge` | nothing unless separately authorized | all other actions |

Pushing never creates a PR as a side effect. `git-pr` is a separate action.
`git-sync` first verifies that the relevant PR is actually `MERGED`; a user
statement alone is not proof of merge. The provider state is `MERGED` only when
read-only provider evidence confirms it.

## Isolated integration boundary

The isolated workflow owns decomposition, wave barriers, and operational
sequence. The canonical authorization here controls only what the plan and
user action permit. The orchestrator remains accountable for central
integration, final validation, review, delivery, and cleanup. Completion order
never determines integration order. Integrated-state validation remains
central after every transfer. Conflicts preserve worker resources and return
`BLOCKED` when safe restoration cannot be proven.

## Cleanup

Only run-owned clean worker resources whose accepted commits are mapped may be
removed. Dirty, stale, conflicting, manually removed, or ambiguous resources
remain in place and are reported. Never use `git worktree remove --force`,
`git clean -fd`, hard reset, force deletion, or equivalent destructive cleanup
against ambiguous state; forced removal is never automatic.
