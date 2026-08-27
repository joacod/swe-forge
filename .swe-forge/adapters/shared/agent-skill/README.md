# Shared Agent Skill Adapter

Codex and Cursor share this experimental explicit-invocation projection:

```text
Skill:   ~/.agents/skills/swe-forge/
Support: ~/.agents/swe-forge/
```

Install one harness at a time:

```text
scripts/swe-forge install codex
scripts/swe-forge install cursor
```

The skill disables implicit invocation where supported; Codex also uses
`agents/openai.yaml`. Invoke `$swe-forge` in Codex or `/swe-forge` in Cursor.
Native launches receive the validated canonical brief; the skill does not build
it. See [shared adapter behavior](../../README.md).

References:

- https://developers.openai.com/learn/codex
- https://learn.chatgpt.com/docs/build-skills
- https://cursor.com/docs/skills
- https://cursor.com/docs/rules
