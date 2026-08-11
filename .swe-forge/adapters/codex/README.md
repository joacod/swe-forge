# Codex Adapter

Codex supports the portable `AGENTS.md` contract and Agent Skills. This
adapter keeps the canonical workflow in `AGENTS.md`, `SWE-FORGE.md`, and
`.swe-forge/`, then exposes an explicit `$swe-forge` skill without copying the
workflow into Codex-specific configuration.

## Project installation

Install the source-linked adapter into a project:

```bash
scripts/swe-forge install codex --target /path/to/project
scripts/swe-forge verify codex --target /path/to/project
```

The installer provides:

```text
AGENTS.md                         canonical project instructions
SWE-FORGE.md                      canonical workflow specification
.swe-forge/                       canonical roles, contracts, policies, and workflow
.agents/skills/swe-forge/         explicit Codex skill loader
```

Codex discovers project instructions from the repository's `AGENTS.md` and
project skills from `.agents/skills/`. The skill's `agents/openai.yaml` sets
`allow_implicit_invocation: false`, so ordinary prompts do not activate SWE
Forge. Invoke it explicitly with `$swe-forge <ticket>` or use the natural
language activation contract from `AGENTS.md`.

## Global installation

Install the source-linked user adapter explicitly:

```bash
scripts/swe-forge install codex --global
scripts/swe-forge verify codex --global
```

The global installation uses:

```text
~/.codex/swe-forge/          source-linked canonical support files
~/.agents/skills/swe-forge/  source-linked user skill
```

It does not modify `~/.codex/AGENTS.md`, `config.toml`, permissions, models,
credentials, or other personal Codex configuration. The global skill reads the
canonical files through the stable `~/.codex/swe-forge/` support path.

## Native capabilities

Codex provides native subagents, sandboxing, approval controls, models, and
Git worktrees. SWE Forge leaves those choices to Codex and the canonical
routing and safety policies; it does not install a model, permission, or
subagent configuration. If a requested topology is unavailable, the workflow
uses its documented fallback rules.

## References

The adapter follows current OpenAI guidance for:

- [Codex](https://developers.openai.com/learn/codex)
- [AGENTS.md instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Codex skills](https://learn.chatgpt.com/docs/build-skills)
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)

References checked on 2026-08-11.
