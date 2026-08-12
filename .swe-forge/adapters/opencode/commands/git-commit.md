---
description: Review and commit selected local changes without pushing
---

The user explicitly invoked the `git-commit` delivery action.

Read @.swe-forge/policies/delivery.md and follow its `commit` action only. Review
status and diffs before staging, preserve unrelated changes and secrets, detect
protected or detached branches, and create a local commit only after the
required checks. Apply the policy's imperative, capitalized, punctuation-free
subject rules and include a separated what/why body when the subject cannot
preserve important context. Do not push, create a pull request, merge, or sync
as a side effect.

Raw action arguments:

$ARGUMENTS
