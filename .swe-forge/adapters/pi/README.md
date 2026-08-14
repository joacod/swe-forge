# Pi Adapter

This adapter exposes SWE Forge through Pi's global prompt-template convention.
It does not add an extension, plugin, package manifest, or Pi settings entry.

## Global Installation

Install the source-linked global bridge explicitly:

```bash
scripts/swe-forge install pi --global
scripts/swe-forge verify pi --global
```

The installer creates:

```text
~/.pi/agent/prompts/swe-forge.md
~/.pi/agent/prompts/git-commit.md
~/.pi/agent/prompts/git-push.md
~/.pi/agent/prompts/git-pr.md
~/.pi/agent/prompts/git-sync.md
~/.pi/agent/swe-forge/
```

The prompt loader points to the canonical `AGENTS.md`, `SWE-FORGE.md`, and
`.swe-forge/` files in the support directory. Link mode is the default, so
updating the stable SWE Forge checkout updates the installed source after
review. Global copy mode remains unsupported, matching the other global
installations.

## Invocation

Pi derives the prompt-template command from its filename:

```text
/swe-forge <ticket>                 # guided checkpoints (default)
/swe-forge pr <ticket>              # verify and create a PR without checkpoints
/swe-forge isolated <ticket>        # explicit isolated topology
/swe-forge isolated pr <ticket>     # isolated topology with PR delivery
/swe-forge pr isolated <ticket>     # delivery token first
```

The canonical parser also supports `/swe-forge solo ...` and
`/swe-forge subagents ...`. A leading `herdr` is not a topology alias; the
workflow gives migration guidance to use `isolated` and request Herdr as a
separate provider preference. To request a provider without changing the
reserved topology grammar, state it in the ticket, for example: "Use
`isolated` with Herdr as the execution provider." The provider-selection policy
records that preference separately.

The template uses Pi's `$ARGUMENTS` expansion and is only processed when the
user explicitly types `/swe-forge`. Ordinary prompts remain unchanged. The
separate `/git-commit`, `/git-push`, `/git-pr`, and `/git-sync` prompts load the
canonical delivery policy. See [shared adapter behavior](../README.md) for the
workflow and delivery rules.

### Context management

The inspected Pi 0.84.1 runtime provides native context telemetry in its
interactive footer and automatic compaction by default. Its documented
threshold is `contextTokens > contextWindow - reserveTokens`; the defaults are
`reserveTokens: 16384` and `keepRecentTokens: 20000`. Pi also recognizes a
provider-reported overflow or recoverable length response, compacts, and
retries the interrupted turn once. Threshold compaction happens at a safe
session boundary and does not mean that a completed response is replayed.

This is host evidence, not a portable SWE Forge guarantee. The prompt-template
adapter is a thin loader and cannot call Pi's extension APIs directly, so the
canonical workflow must not pretend that it can inspect `ctx.getContextUsage()`
or invoke `ctx.compact()` on every host. Keep automatic compaction enabled,
consider a larger response reserve for unusually long reasoning/tool turns,
and use `/compact <instructions>` as the manual fallback at a completed
boundary. After Pi compacts or retries, follow the canonical context policy:
re-read the external working spec and run state, inspect the current Git
`HEAD`, and resume only from the recorded next action. A model/provider label,
including a large advertised context window, is not evidence that its overflow
errors will be classified by Pi.

Pi does not provide native writable isolated workers by default. If
`SUBAGENTS` is unavailable, the canonical workflow falls back to `SOLO` or
sequential execution according to its routing and safety rules. `ISOLATED` is
portable at the workflow level and uses demonstrated native harness worktree
capabilities or the optional Herdr provider when available; it is not
universally available in every Pi setup. Herdr remains outside this harness
adapter and is never installed automatically.

## References

The adapter was designed against the current Pi documentation for:

- global prompt templates under `~/.pi/agent/prompts/`
- prompt-template arguments and `$ARGUMENTS`
- global settings and resource discovery

References checked on 2026-08-11:

- https://pi.dev/docs/latest/prompt-templates
- https://pi.dev/docs/latest/settings
