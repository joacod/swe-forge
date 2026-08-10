# Herdr Execution Runbook

Use this runbook only after the orchestrator has selected `HERDR` and the
Herdr environment check succeeds.

## 1. Verify Ownership

Run the guard before control commands:

```bash
test "${HERDR_ENV:-}" = 1
```

If it fails, stop using Herdr commands. Select native subagents or sequential
execution instead. Do not attach to or manipulate a session owned by another
process.

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

## 3. Choose Isolation

Use a shared workspace only for read-only research or when one writer owns the
checkout. Concurrent writable workers require separate Git worktrees.

Selecting `HERDR` does not authorize branch or worktree creation. Before using
`worktree.create`, obtain explicit user authorization for that setup action.
Opening an existing checkout does not need creation authorization, but before
any edit classify the integration checkout and every writable worker checkout
under the canonical protected-branch gate. Each must be dedicated,
non-protected, attached, and safely classifiable.

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

Pass native harness arguments only after `--`. Start the worker in its isolated
worktree when it is a concurrent writer.

Send only the assigned canonical role path, bounded task contract, relevant
architecture evidence, and validation commands. Require the worker to load the
role and result contract before acting:

```bash
herdr agent prompt <worker-name> "Read <resolved-canonical-role-path> and <resolved-canonical-result-contract-path>, then execute <bounded-task-contract>." --wait --timeout 120000
```

Resolve both canonical paths from the active installation root; a global run
must not resolve them against the project checkout. The prompt must require a
result matching that resolved result contract. Do not pass the entire
orchestrator transcript.

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

`agent prompt --wait` waits for a settled lifecycle state. A blocked or unknown
state requires inspection before sending more input. Preserve the structured
result in temporary run state or a file outside the repository.

If terminal output is truncated, ask the worker to write its complete
structured result to a temporary Markdown file and return only the path. Use
this fallback only after normal agent reads are insufficient.

## 6. Integrate Centrally

The orchestrator owns integration. For each isolated worker:

1. inspect its result and task scope
2. inspect the worktree diff and validation evidence
3. integrate its patch into the central checkout sequentially
4. resolve conflicts centrally
5. rerun affected validation

Do not let Herdr workers modify the central checkout concurrently. A temporary
worker commit may be used only when the user explicitly authorized commits and
the task contract transmits that authorization. Do not push, create a pull
request, publish, or merge without explicit authorization for that action.

## 7. Clean Up Safely

Close or remove only workspaces, panes, and worktrees created for this run.
Do not close user-owned sessions, stop the Herdr server, or delete branches
unless the user explicitly requests it.

Before removing a writable worktree, require either a clean status or evidence
that every tracked and untracked change is represented in the integrated
checkout or a preserved external patch. If that proof is incomplete, leave the
worktree in place and report it rather than risking data loss.

Record cleanup status and any remaining worktree or process in the final report.

## 8. Fallback

If Herdr is unavailable, the environment guard fails, a command is unsupported,
or isolation no longer provides value:

1. use native subagents if the tasks are independent without isolation
2. serialize the tasks if writers would otherwise conflict
3. use `SOLO` when one context is safest

Record the original mode, the failure evidence, and the fallback mode.
If isolation remains necessary for safe execution, or the user prohibited
fallback, return `BLOCKED` instead of reducing the topology.
