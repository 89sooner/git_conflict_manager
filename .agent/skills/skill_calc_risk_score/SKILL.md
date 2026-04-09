---
name: calculate-pr-risk-score
description: analyze pull request file changes and metadata to produce an embedded-focused risk score from 0 to 100. use when chatgpt needs to estimate pr risk, identify risk factors for firmware or platform code changes, evaluate release-branch merge sensitivity, or summarize why a pull request should receive deeper review or blocking attention.
---

# calculate pr risk score

Analyze pull request file changes and review metadata, then estimate an embedded-focused risk score from 0 to 100.

Do not treat the score as an objective truth.
Explain the score using concrete risk factors from the input.
Clamp the final score to the range 0 through 100.
Prefer transparent scoring over hidden heuristics.

## required inputs

Use these inputs when available:

- changed files
- target branch
- author experience level

If one or more inputs are missing, proceed with the available information and clearly state which assumptions were made.

## scoring model

Start with a base score of 10.

Add risk based on the following signals.

### core layer changes

If any changed file path suggests modification in core or low-level areas such as:

- bootloader/
- kernel/
- driver/
- drivers/
- arch/
- platform/
- hal/

add 40 points.

Reason:
Core platform or hardware-facing code changes can have broad system impact.

### multi-subsystem changes

If the changed files appear to affect more than two distinct subsystems, add 20 points.

Examples of subsystem evidence include:

- display
- audio
- power
- camera
- memory
- connectivity
- sensor
- thermal
- boot
- security

Reason:
Cross-subsystem changes increase integration and side-effect risk.

### release branch targeting

If the target branch starts with `release-`, add 30 points.

Reason:
Changes intended for a release branch require stricter stability standards.

### low repository familiarity

If `author_exp_level` is `novice`, add 10 points.

Reason:
New contributors may require closer review for platform-specific constraints and repository conventions.

### missing visible test coverage

If no changed file path appears related to tests, validation, simulation, or verification, add 15 points.

Examples of possible evidence:

- test
- tests
- unittest
- integration-test
- qa
- validation
- verify

Reason:
Missing visible test updates can increase regression risk.

## interpretation rules

When determining subsystem count:

1. infer subsystems from directory names, filenames, module names, or platform terms
2. group closely related files into the same subsystem
3. do not over-count generic shared folders unless the diff clearly spans multiple domains

When determining test coverage:

- treat test-related file paths as a positive signal
- do not assume production code changes are safe just because tests exist
- if test coverage is unknown rather than absent, say so explicitly

When using author experience:

- use the provided level only
- do not infer seniority from tone, commit count, or guessed history unless explicit evidence is given elsewhere

## risk level mapping

Map the final score to a risk level as follows:

- 0 to 24: LOW
- 25 to 49: MEDIUM
- 50 to 74: HIGH
- 75 to 100: BLOCK

If the score reaches 100 after clamping, keep the reasons that pushed it above the cap in the explanation.

## workflow

1. Read the changed file list, target branch, and author experience level.
2. Identify whether low-level or core platform areas were modified.
3. Infer the likely affected subsystems from file paths.
4. Count whether the change spans more than two subsystems.
5. Check whether the target branch is a release branch.
6. Check whether any visible test-related files are present.
7. Apply the scoring rules and clamp the result to 0 through 100.
8. Return the score, risk level, and risk factors with brief reasoning.

## output requirements

Return JSON only.

Use this schema:

```json
{
  "score": 0,
  "risk_level": "LOW",
  "risk_factors": [
    "reason 1",
    "reason 2"
  ]
}