# Example: Default PR Ticket

Invocation:

```text
/swe-forge add-health-check
```

The default is `PR` delivery with automatic topology. The root records the raw
invocation, derives observable acceptance, and keeps the working spec
temporary:

```yaml
goal: Add a health-check endpoint.
scope:
  in: [endpoint and focused coverage]
  out: [deployment and unrelated service changes]
acceptance:
  - the endpoint reports service health using the repository's response shape
  - focused coverage passes
approach: Reuse the existing routing and health signal.
risks:
  - exposing internal details; return only the established public shape
validation:
  testing:
    behavior: endpoint health response and compatibility
    seam: HTTP endpoint
    approach: acceptance
    rationale: Focused endpoint coverage is the smallest useful evidence.
  checks: [focused endpoint tests, relevant repository checks]
review_focus:
  goal: Confirm endpoint behavior, compatibility, and scope.
  acceptance_criteria_checked: [health response, compatibility]
```

After implementation, run the smallest final validation groups once against the
committed candidate and perform one fresh independent review. A concrete,
localized finding may receive one focused repair and affected validation; the
repaired candidate is reported as not independently re-reviewed. A fundamental
or uncertain finding blocks. No second review is launched.

After local gates pass, PR mode pushes the one task branch, creates one PR,
records its URL, and reports the result. It does not await remote CI or merge.
The project-facing PR contains only the outcome, relevant validation, and
material risks. A later `merged` sync first verifies the remote PR state.
