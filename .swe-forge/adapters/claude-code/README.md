# Claude Code Adapter

Claude Code reads `CLAUDE.md`, not `AGENTS.md`, so the repository root includes
the smallest compatible bridge:

```markdown
@AGENTS.md
```

This import keeps `AGENTS.md` as the shared discovery and activation source.
Do not add the Forge workflow to `CLAUDE.md`.

## Explicit Skill

Copy or link `skills/swe-forge/SKILL.md` to:

```text
.claude/skills/swe-forge/SKILL.md
```

The skill creates `/swe-forge` and uses `disable-model-invocation: true`, so
Claude can run it only when the user explicitly invokes it. The skill body is a
loader that reads `AGENTS.md`, `SWE-FORGE.md`, and the ticket workflow; it does not
duplicate them.

In the default link mode, the project `CLAUDE.md` is a relative symlink to the
project `AGENTS.md`. Copy mode writes the equivalent `@AGENTS.md` bridge.

Natural-language activation remains available without installing the skill:

```text
Use SWE Forge.

<ticket>
```

See [shared adapter behavior](../README.md) for the workflow and delivery rules.

## Native Subagents

Claude Code supports project subagents under `.claude/agents/`. Add a thin
role bridge only when native registration provides a real benefit. Before
launch, render the compact `worker_briefing` projection from the canonical task
and current run state using `../../contracts/worker-brief.md`. The bridge
should instruct the subagent to read the relevant canonical role file and
repository-instruction references, plus the appropriate result/review contract.
For a completed dependency, the projection carries only the root-derived,
B-relevant accepted `dependency_digest`, never the full dependency result or a
peer message. It must not forward the root transcript, unrelated ticket history,
the full SWE Forge specification, or pasted repository contents. For
independent discovery, launch the useful read-only workers as one bounded batch
before consuming any result, then let the root wait at one fan-in barrier and
resolve the structured results. Do not create a worker for a coupled question
or use a follow-up for adjacent completeness. Native workers with
dedicated worktrees, exact integration bases, structured results, and lifecycle
control may satisfy the `NATIVE` provider contract for `ISOLATED`; otherwise
writable delegation remains sequential in `SUBAGENTS` and omits isolated
provider/worktree fields.

Use read-only tool lists for researchers, architects, reviewers, security
reviewers, and performance reviewers. Give write tools only to a bounded task
whose contract authorizes them. Omit model fields unless the user explicitly
chooses a model mapping.
Writable native subagents in one checkout must run sequentially. Concurrent
writers require separate dedicated, classified worktrees and are classified as
`ISOLATED`; non-overlapping file scope alone does not make a shared checkout
safe. Final integration remains with the root orchestrator on the one
integration/delivery branch. To request Herdr without making it a topology
alias, state "Use `isolated` with Herdr as the execution provider" in the
natural-language ticket.

## Global Installation

When the user explicitly requests a global installation, the installer links:

```text
~/.claude/skills/swe-forge/SKILL.md
~/.claude/swe-forge/AGENTS.md
~/.claude/swe-forge/SWE-FORGE.md
~/.claude/swe-forge/.swe-forge/
```

The global skill reads the canonical files through that stable support path, so
`git pull` in the source checkout updates future sessions. Existing global
files are never overwritten.

## References

The adapter follows current Claude Code conventions for:

- project `CLAUDE.md` imports using `@AGENTS.md`
- project skills under `.claude/skills/<name>/SKILL.md`
- user-invoked skills with `disable-model-invocation: true`
- project subagents under `.claude/agents/`

References checked on 2026-08-10:

- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/skills
