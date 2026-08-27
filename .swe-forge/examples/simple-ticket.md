# Example: Small Guided Ticket

Ticket:

```text
Fix the receipt formatter so a missing optional discount renders as "-".
Keep existing currency formatting unchanged.
```

Invocation:

```text
/swe-forge guided <ticket>
```

## Spec

```yaml
goal: Show `-` only for a missing discount.
scope:
  in: [receipt total formatter and its focused tests]
  out: [other receipt fields and currency behavior]
acceptance:
  - missing discount renders as `-`
  - zero and non-zero discounts retain current formatting
approach: Add focused cases at the existing formatter seam.
risks:
  - confusing zero with missing; preserve the current numeric branches
validation:
  testing:
    behavior: missing, zero, and non-zero discount formatting
    seam: receipt total formatter
    approach: acceptance
    rationale: Focused cases cover the observable branches.
  checks: [receipt formatter tests, final diff inspection]
review_focus:
  goal: Confirm missing-value behavior and compatibility.
  acceptance_criteria_checked: [missing, zero, non-zero]
```

Delegation would add no useful independence, so routing is `SOLO`. The agent
loads delivery before writing, validates the completed slice, and stops at the
GUIDED human pause. `go` authorizes the reviewed local commit only; it does not
authorize push, PR creation, or merge.

A final report uses the [compact contract in `SWE-FORGE.md`](../../SWE-FORGE.md): it names
meaningful validation and mentions skipped or unavailable checks only when they
matter. If the change is trivial and localized, the workflow may record why
independent review was skipped. It never claims acceptance from code inspection
alone.
