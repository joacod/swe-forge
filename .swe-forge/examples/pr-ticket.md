# Example: Default PR Ticket

Invocation:

```text
/swe-forge add-health-check
```

Default: `PR` delivery with automatic topology. The root preserves the raw
invocation and temporary working spec:

```yaml
goal: Add a health-check endpoint.
scope:
  in: [endpoint and focused coverage]
  out: [deployment and unrelated service changes]
acceptance:
  - endpoint reports service health in the established response shape
  - focused coverage passes
approach: Reuse existing routing and health signal.
risks: [return no internal details]
validation:
  testing:
    behavior: health response and compatibility
    seam: HTTP endpoint
    approach: acceptance
    rationale: Focused endpoint coverage is sufficient.
  checks: [focused endpoint tests, relevant repository checks]
review_focus:
  goal: Confirm behavior, compatibility, and scope.
  acceptance_criteria_checked: [health response, compatibility]
```

After implementation, run selected final validation once on the committed
candidate and perform one fresh review. One concrete localized finding may get
one focused repair and affected validation; do not re-review the repair. A
fundamental or uncertain finding blocks.

After local gates, PR mode pushes one branch, creates one PR, records its URL,
and reports. It does not await remote CI or merge. The PR contains outcome,
relevant validation, and material risk only.
