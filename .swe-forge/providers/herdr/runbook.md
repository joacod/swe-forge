# Herdr Isolated-Execution Provider Runbook

Use this runbook only after the orchestrator has selected
`execution_mode: ISOLATED`, provider selection has recorded
`execution_provider: HERDR`, and the Herdr environment ownership check
succeeds. This runbook is a provider implementation note; the canonical
behavior lives in `.swe-forge/workflows/isolated-execution.md`, the task and
result contracts, and the routing/provider policies.

## 1. Verify Ownership

Run the guard before every control command:

```bash
test "${HERDR_ENV:-}" = 1
```

If it fails, stop using Herdr commands. Select a native provider when it
satisfies the contract, or fall back to sequential `SUBAGENTS`/`SOLO`. Do not
attach to or manipulate a session owned by another process.

Learn the installed command surface without launching the TUI:

```bash
herdr --help
herdr agent
herdr pane
herdr workspace
herdr tab
herdr worktree
```

The installed binary is authoritative for flags and response shapes.

## 2. Inspect the Session

Use caller context and explicit IDs. Do not rely on whichever pane is focused
in another client.

```bash
herdr workspace list
herdr pane current --current
herdr pane list --workspace "$HERDR_WORKSPACE_ID"
herdr agent list
```

Use `--current`, a returned pane ID, or a unique live agent name when targeting
resources. Preserve the user's focus with `--no-focus` for background work.

Lifecycle state from these commands is scheduling evidence only. It does not
prove that a task was accepted. The orchestrator must collect the structured
worker result, inspect Git branch/worktree state, run or verify validation, and
integrate centrally.

## 3. Choose Isolation

A Herdr-backed read-only investigation is a `SUBAGENTS` backend and may use a
shared workspace when the worker has no write access. Record
`delegation_backend: HERDR`, `write_isolation: SHARED`, and
`execution_provider: NONE`; do not relabel it `ISOLATED`.

Use a shared workspace only for read-only research or when one writer owns the
checkout. Concurrent writable workers require separate Git worktrees and the
semantic `ISOLATED` topology. Selecting Herdr as a backend does not itself
select or authorize isolation.

Selecting an execution provider does not authorize unplanned worktree creation.
For an explicit `isolated` invocation, follow the setup checkpoint and
`continue`/`go` meanings in the canonical `.swe-forge/policies/delivery.md`;
provider selection alone never authorizes concrete resources or delivery. When
`AUTO` selects `ISOLATED` under `GUIDED`, show the setup checkpoint and wait for
`continue` before creating multiple worker resources.

The orchestrator creates one integration worktree and one safe non-protected
integration/delivery branch for the ticket. Each concurrent worker receives a
namespaced local-only branch and a dedicated worktree from the exact recorded
integration `HEAD`. Worker branches are never pushed and never receive PRs.
The integration worktree belongs exclusively to the orchestrator.

The current Herdr worktree surface includes these operations:

- create a worktree from a source workspace
- open an existing checkout
- list linked worktrees
- remove a linked checkout without deleting its branch

Use the installed `herdr worktree` command group or the corresponding raw API
methods `worktree.create`, `worktree.open`, `worktree.list`, and
`worktree.remove`. Parse returned workspace, tab, pane, and worktree IDs; never
predict them.

## 4. Start a Bounded Worker

For a sibling pane in the current directory, preserve the caller's working
directory and focus:

```bash
herdr pane split --current --direction right --cwd "$PWD" --no-focus
```

Read the returned pane ID, then start the requested harness agent with a unique
live name:

```bash
herdr agent start <worker-name> --kind <harness-kind> --pane <pane-id>
```

Start a concurrent writer in its dedicated worker worktree. Send only the
assigned canonical role path, bounded task contract, relevant architecture
evidence, and validation commands. Require the worker to load the role and
result contract before acting:

```bash
herdr agent prompt <worker-name> "Read <resolved-canonical-role-path> and <resolved-canonical-result-contract-path>, then execute <bounded-task-contract>." --wait --timeout 120000
```

Resolve both canonical paths from the active installation root; a global run
must not resolve them against the project checkout. The prompt must require a
result matching that resolved result contract. Do not pass the entire
orchestrator transcript. Workers cannot create additional workers or worktrees
and cannot delegate recursively unless their contract explicitly authorizes it.

## 5. Inspect and Wait

Read the worker through its stable agent name or returned pane ID:

```bash
herdr agent get <worker-name>
herdr agent read <worker-name> --source recent-unwrapped --lines 120
```

Use semantic waits rather than guessing from terminal output:

```bash
herdr agent wait <worker-name> --until blocked --timeout 120000
```

Use the installed binary's documented settled-state options when available. A
blocked or unknown state requires inspection before sending more input. Preserve
the structured result in temporary run state or a file outside the repository.
If terminal output is truncated, ask the worker to write its complete
structured result to a temporary Markdown file and return only the path. Use
this fallback only after normal agent reads are insufficient.

## 6. Verify the Worker Result

Before integration, the orchestrator checks that:

- task, provider, branch, and worktree identities match run state
- the worker started from the expected exact `base_sha`
- the worker checkout is clean
- every changed file is declared and in scope
- every change is represented by a deliverable local transfer commit
- no unexplained staged, unstaged, or untracked changes remain
- required worker-level validation passed
- no worker push, PR, merge, publication, deployment, or recursive delegation
  occurred
- environment resources and cleanup commands are recorded

Herdr lifecycle status is never sufficient for eligibility.

## 7. Integrate Centrally

The orchestrator owns integration. For each isolated worker:

1. inspect its result, task contract, and worktree diff
2. verify scope, exact base, branch identity, and validation evidence
3. record a clean integration checkpoint
4. apply the worker transfer commit to the integration checkout without
   immediately finalizing the integration commit
5. run required integrated-state validation
6. create the final integration commit only after validation passes
7. record the source-commit to integration-commit mapping
8. continue in the planned dependency/integration order, never completion order

Do not let Herdr workers modify the central checkout concurrently. Do not
blindly merge worker branches or copy entire worktrees. Resolve no conflict
silently. A conflict between independent tasks requires preserving both worker
resources, restoring the integration worktree to its safe checkpoint, and
re-evaluating or serializing the affected tasks.

Keep the central integration branch as the one delivery branch for the run;
worker worktrees are isolated implementation resources that are integrated
centrally. Do not push, create a pull request, publish, deploy, or merge without
the canonical action authorization for that action.

## 8. Environment Resources

Worktrees do not isolate runtime resources automatically. Before launching a
wave, record and verify:

```yaml
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

Copy ignored files only from an explicit allowlist. Never copy every ignored
file or arbitrary secrets. Allocate unique ports, database names, Docker
project names, and temporary paths. Inspect setup commands for side effects.
Serialize execution when safe isolation is unavailable. Migrations and shared
persistent environments are separately authorized effects.

## 9. Clean Up Safely

After final acceptance and PR creation:

- verify every accepted source commit has an integration mapping
- verify every worker worktree is clean
- remove only workspaces, panes, and worktrees created for this run
- never use forced removal automatically; require a clean status before removal
- delete integrated worker branches only with safe deletion
- remember that removing a Herdr worktree does not delete its branch
- do not close user-owned sessions or stop the Herdr server
- do not delete the central integration/delivery branch unless the user asks
- preserve and report dirty, blocked, or unresolved resources
- keep the integration branch for the PR
- record remaining worktrees, branches, processes, provider sessions, and
  environment resources

Before removing a writable worktree, require either a clean status or evidence
that every tracked and untracked change is represented in the integrated
checkout or an externally preserved patch. If proof is incomplete, leave the
worktree in place and report it rather than risking data loss. Never use
`git worktree remove --force`, `git clean -fd`, or equivalent destructive
cleanup against ambiguous state.

## 10. Fallback

If Herdr is unavailable, the ownership guard fails, a command is unsupported,
or isolation no longer provides value:

1. use a native provider if it satisfies the isolated worker contract
2. serialize the tasks if writers would otherwise conflict
3. use sequential `SUBAGENTS` or `SOLO` when safe
4. return `BLOCKED` if required isolation would be lost

Record the requested mode, requested provider, failure evidence, fallback
provider/topology, and reason. Do not fabricate a generic provider or claim
worker acceptance from lifecycle output.
