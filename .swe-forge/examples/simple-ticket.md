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

Transient spec:

```yaml
goal: Show `-` only for a missing discount.
scope:
  in: [receipt total formatter and focused tests]
  out: [other receipt fields and currency behavior]
acceptance:
  - missing discount renders as `-`
  - zero and non-zero discounts retain current formatting
approach: Add focused cases at the existing formatter seam.
risks: [do not confuse zero with missing]
validation:
  testing:
    behavior: missing, zero, and non-zero discount formatting
    seam: receipt total formatter
    approach: acceptance
    rationale: Focused cases cover the observable branches.
  checks: [formatter tests, final diff inspection]
review_focus:
  goal: Confirm missing-value behavior and compatibility.
  acceptance_criteria_checked: [missing, zero, non-zero]
```

Delegation adds no independence, so routing is `SOLO`. Load delivery before
writing, validate the completed clean candidate, then stop at the `GUIDED`
human checkpoint. `go` authorizes the reviewed local commit only; it does not
authorize push, PR creation, or merge.

Use the [final report contract](../../SWE-FORGE.md). A trivial localized change
may record why independent review was skipped; code inspection alone never
proves acceptance.
