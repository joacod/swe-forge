# Shared Agent Skill Adapter

Codex and Cursor both support the open Agent Skills layout. This shared
projection keeps one skill payload and one explicit-invocation policy for both
harnesses:

```text
Project: .agents/skills/swe-forge/
Global:  ~/.agents/skills/swe-forge/
Support: ~/.agents/swe-forge/
```

Install either harness explicitly:

```bash
scripts/swe-forge install codex --target /path/to/project
scripts/swe-forge install cursor --target /path/to/project
scripts/swe-forge install codex --global
scripts/swe-forge install cursor --global
```

The installer registry maps both Codex and Cursor to this shared source tree
and destination. Installing both is unnecessary and is intentionally not
offered as a multi-harness operation.

The skill sets `disable-model-invocation: true` for hosts that support that
field, while `agents/openai.yaml` disables implicit invocation in Codex. Users
invoke the installed skill explicitly as `$swe-forge` in Codex or
`/swe-forge` in Cursor.

References checked on 2026-08-11:

- https://developers.openai.com/learn/codex
- https://learn.chatgpt.com/docs/build-skills
- https://cursor.com/docs/skills
- https://cursor.com/docs/rules
