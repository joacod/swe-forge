# Worker Briefing Contract

The worker brief is the one canonical worker-facing assignment. The root owns
the task contract and run state, then creates this bounded JSON object
immediately before launch. There is no second input record set or re-render step.

## Validation and adapter port

Use the portable tool to validate the object before launch:

```text
.swe-forge/tools/swe-forge-worker-brief validate --brief FILE|-
.swe-forge/tools/swe-forge-worker-brief inspect --brief FILE|-
```

`validate` checks the complete shape and the permission/profile relationships.
`inspect` performs the same validation and emits only `task_id`, `profile`, and
`write_access` for a host adapter. Neither command decides scope, acceptance,
dependency relevance, routing, or delivery. The root must pass the validated
JSON unchanged to the worker.

JSON is intentionally both the native structured form and the text fallback:
hosts without structured-output support receive the same concise JSON text and
must return the result fields in `contracts/result.md`. Do not introduce a
host-specific alternate encoding.

## Canonical shape

```json
{
  "worker_briefing": {
    "schema": "worker-brief/v1",
    "task_id": "<assigned task>",
    "worker": {
      "role": "<canonical role>",
      "mode": "delegated_worker",
      "depth": 1,
      "recursive_delegation": false
    },
    "objective": "<one bounded objective>",
    "acceptance": ["<relevant checkable criterion>"],
    "repository": {
      "instructions": ["<relevant instruction path>"],
      "allowed_reads": ["<path, symbol, or command scope>"],
      "allowed_writes": ["<path or none>"]
    },
    "architecture_decisions": ["<task-relevant decision>"],
    "dependencies": {
      "completed": [
        {
          "task_id": "<accepted dependency>",
          "dependency_digest": {
            "accepted_decisions": ["<accepted fact>"],
            "relevant_facts": ["<fact the worker needs>"],
            "changed_interfaces": ["<interface>"],
            "paths_symbols": ["<path or symbol>"],
            "authoritative_assumptions": ["<assumption>"],
            "validation_facts": ["<relevant check>"],
            "unresolved_risks": ["<relevant risk>"],
            "source_refs": ["<accepted result or evidence reference>"]
          }
        }
      ],
      "pending": ["<dependency>"]
    },
    "validation": [
      {
        "command": "<assigned check>",
        "requirement": "required | conditional | informational",
        "condition": "<observable condition>",
        "side_effects": "local-only | external-read | external-write | destructive"
      }
    ],
    "permissions": {
      "write_access": "read-only | read-write",
      "topology": "SUBAGENTS",
      "allowed_actions": ["<derived actions>"],
      "forbidden_actions": ["<derived prohibitions>"]
    },
    "return": {
      "profile": "READ_ONLY | WRITABLE | REVIEW",
      "contract": "<canonical result or review contract>",
      "expected_output": ["<fields the root consumes>"]
    }
  }
}
```

`dependencies` is omitted when there are no dependency facts. Empty digest
categories are omitted, and every completed digest includes a non-empty
`source_refs` list pointing to the accepted result or evidence. A completed
dependency is included only after the root has accepted its result and selected
the facts relevant to this task; the brief cannot turn a pending or unaccepted
result into an accepted fact.

The profile and actions are derived from the role and write access:

| Worker | Profile | Allowed actions | Contract |
| --- | --- | --- | --- |
| read-only ordinary worker | `READ_ONLY` | `read`, `validation` | `result.md` |
| read-write worker | `WRITABLE` | `read`, `edit`, `validation` | `result.md` |
| reviewer | `REVIEW` | `read` | `review.md` |

Every delegated brief uses `SUBAGENTS`, disables recursive delegation, and
forbids delivery, recursive delegation, peer communication, scope expansion,
and topology decisions. Reviewers may inspect assigned validation evidence but
are not granted validation actions. Read-only workers use
`allowed_writes: ["none"]`.
Read-write workers list their owned paths. Physical worktrees, checkout paths,
provider details, and delivery authorization are not worker-brief fields.

Workers discover details through allowed paths and request a contract revision
before expanding scope. They do not create PRs, push, merge, publish, deploy,
reroute, or spawn descendants by default. A writable result reports the
canonical candidate facts; it does not authorize delivery.
