# Worker Briefing Contract

The worker brief is the one canonical worker assignment. The root owns the task
contract and run state, creates this bounded JSON immediately before launch, and
passes it unchanged. There is no second input record or re-render step.

## Validation and adapter port

Validate it before launch:

```text
.swe-forge/tools/swe-forge-worker-brief validate --brief FILE|-
.swe-forge/tools/swe-forge-worker-brief inspect --brief FILE|-
```

`validate` checks shape and permission/profile relationships. `inspect` does the
same and emits only `task_id`, `profile`, and `write_access`. Neither decides
scope, acceptance, dependency relevance, routing, or delivery. JSON is both the
native form and text fallback; hosts must return fields from `contracts/result.md`.

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

Omit `dependencies` without dependency facts and empty digest categories.
Every completed digest has non-empty `source_refs` to an accepted result or
evidence. A dependency is included only after root acceptance; a brief cannot
promote pending work.

## Profile rules

| Worker | Profile | Actions | Contract |
| --- | --- | --- | --- |
| read-only ordinary worker | `READ_ONLY` | `read`, `validation` | `result.md` |
| read-write worker | `WRITABLE` | `read`, `edit`, `validation` | `result.md` |
| reviewer | `REVIEW` | `read` | `review.md` |

Every delegated brief uses `SUBAGENTS`, disables recursion, and forbids delivery,
peer communication, scope expansion, and topology decisions. Read-only workers
use `allowed_writes: ["none"]`; writable workers list owned paths. Reviewers may
inspect evidence but have no validation actions. Physical worktrees, checkout
paths, provider details, and delivery authorization are not brief fields.

Workers discover through allowed paths and request a contract revision before
expanding scope. They do not create PRs, push, merge, publish, deploy, reroute,
or spawn descendants by default. A writable result reports candidate facts; it
does not authorize delivery.
