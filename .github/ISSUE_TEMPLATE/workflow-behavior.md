---
name: Workflow behavior problem
about: Report incorrect or surprising SWE Forge workflow behavior
title: "[Workflow] "
labels: ""
assignees: ""
---

## Behavior

What did SWE Forge do, and what should it have done instead? Report observed
workflow behavior separately from installer or projection/fixture validation;
a successful projection does not establish harness behavior.

## Ticket and invocation

- Harness and version:
- SWE Forge version or commit:
- Raw invocation (`/swe-forge ...` or equivalent, including mode tokens):
- Delivery mode: GUIDED / PR
- Requested topology: AUTO / SOLO / SUBAGENTS
- Selected topology, if known: SOLO / SUBAGENTS / unknown
- Native subagent capability, if used: available / unavailable / unknown
- Routing fallback or revision, if any:
- Final status, if known: ACCEPTED / BLOCKED / FAILED / unknown
- Did it create a delivery branch? yes / no / unknown
- Did it create a PR? yes / no / not applicable
- Was context pressure, compaction, or overflow recovery involved? yes / no / unknown

## Evidence

Include the relevant acceptance criteria, validation result, receipt, or
short redacted log. Do not include transcripts, credentials, or private
repository data.

## Impact

- Severity or workaround:
- Would this prevent you from using Forge again? Why?
