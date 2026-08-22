---
name: Installation or adapter problem
about: Report an installation, verification, or harness integration issue
title: "[Installation] "
labels: ""
assignees: ""
---

## Problem

Describe what failed and what you expected to happen. Projection or fixture
validation is useful structural evidence, but it is not a claim that the target
harness was behaviorally validated.

## Environment

- Harness and version:
- Operating system:
- SWE Forge version or commit:
- Installer action: install / verify / status / doctor / update / uninstall / other
- Harness installation command:
- Command run:
- Installation state: fresh / existing managed / legacy or copied / unknown
- Validation kind: projection/fixture / real harness / both
- Was the target harness actually exercised? yes / no

## Evidence

Paste the relevant `status`, `doctor`, or `verify` output. Remove secrets and
personal paths when sharing publicly.

## Reproduction

List the smallest repeatable sequence, including whether the user home
already contained the harness entry, canonical support directory, adapter
files, or a current managed manifest.
