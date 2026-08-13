# Isolated Worker Result Bundle

This is the canonical machine-readable result for a writable isolated worker.
It is intentionally fixed, dependency-free, and validated by
`.swe-forge/tools/swe-forge-isolated-gate`.

```text
result/meta.tsv
result/
  meta.tsv
  commits.txt
  files.txt
  validations.tsv
  scope-exceptions.txt
  staged.txt
  unstaged.txt
  untracked.txt
  resources.tsv
```

`meta.tsv` contains exactly one tab-separated value for each required key:

```text
schema_version<TAB>1
task_id<TAB><task>
status<TAB>DONE | BLOCKED | FAILED
provider<TAB>NATIVE | HERDR
branch<TAB><local branch>
worktree<TAB><absolute worktree>
base_sha<TAB><full SHA>
head_sha<TAB><full SHA>
candidate_fingerprint<TAB><full fingerprint>
```

Do not use `eval`. No YAML parser, JSON parser, unknown required key, repeated key, short
SHA, unsupported control character, or free-form path list is accepted.
`commits.txt` and `files.txt` contain one entry per line. Empty dirty-state
files are required evidence of cleanliness. `validations.tsv` has exactly one
record for every planned worker check and binds each result to the candidate
fingerprint. `resources.tsv` is line-oriented evidence of setup and cleanup.
