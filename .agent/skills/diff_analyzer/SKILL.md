---
name: diff-analyzer
description: analyze git diff content and interpret the meaning of code changes from an embedded architecture perspective. use when chatgpt needs to review a diff, map changed files to soc subsystems, identify generated files, estimate architectural or logical impact beyond raw line counts, or summarize risk and affected components in firmware or low-level platform codebases.
---

# diff analyzer

Analyze the provided git diff and explain the change in terms of embedded system architecture, subsystem ownership, and likely runtime impact.

Do not invent repository structure, subsystem ownership, or build behavior without evidence from the diff or surrounding file paths.
Do not treat raw added or deleted line counts as the primary signal of importance.
Prefer architectural meaning over superficial textual change volume.

## workflow

1. Identify the changed files, file paths, file types, and change scope from the diff.
2. Map each changed file to a likely SoC subsystem based on directory structure, filenames, symbols, macros, driver names, or platform-specific terms.
3. Detect whether a file is likely generated rather than handwritten by checking:
   - file names commonly used for generated outputs
   - header comments indicating generated code
   - repetitive patterns or machine-generated structure
   - build, config, register, or interface artifacts commonly emitted by tooling
4. Estimate logical impact by prioritizing changes such as:
   - function signature changes
   - global variable changes
   - interface or header changes
   - macro or register definition changes
   - init sequence changes
   - state machine changes
   - interrupt, clock, power, memory, or synchronization changes
5. Distinguish local implementation changes from cross-subsystem impact.
6. Summarize the result as an embedded-focused review report.

## analysis rules

When mapping files to subsystems, infer cautiously from evidence such as:

- directory names
- driver names
- peripheral names
- board or platform names
- register blocks
- device tree or configuration patterns
- known domains such as display, audio, power, camera, memory, connectivity, sensor, boot, security, or thermal

When detecting generated files:

- mark a file as likely generated only when there is concrete evidence
- if the evidence is weak, report it as possibly generated
- explain the reason for the classification

When estimating impact:

- assign higher importance to interface and behavior changes than formatting or comment-only changes
- treat shared headers and common configuration files as potentially high blast-radius changes
- treat changes to initialization, interrupts, power sequencing, register programming, and synchronization paths as high risk
- reduce impact when the diff is clearly mechanical, renamed-only, formatting-only, or generated-only

## output requirements

Report results in this order:

1. overall summary
2. changed files and mapped subsystems
3. generated file assessment
4. logical impact assessment
5. architectural risk
6. follow-up review points

Separate confirmed findings from inference.
State uncertainty clearly when repository context is incomplete.

## output format

Use a structure like this:

Overall Summary:
<one to three sentence summary of what changed and why it matters>

Changed Files and Subsystems:
- <file path> -> <likely subsystem> | <reason>
- <file path> -> <likely subsystem> | <reason>

Generated File Assessment:
- <file path> | <generated / likely generated / not generated / unclear> | <reason>

Logical Impact:
- <low / medium / high>
- <key reasons tied to signatures, globals, headers, init flow, registers, shared interfaces, or runtime behavior>

Architectural Risk:
- <local change / subsystem-wide impact / cross-subsystem impact>
- <main risk explanation>

Follow-up Review Points:
- <what should be manually checked next>
- <test or validation recommendation>

## failure handling

If the diff is incomplete, say exactly what is missing.
If subsystem mapping cannot be determined reliably from the diff alone, provide the most likely mapping and mark it as inference.
If generated-file detection is inconclusive, explain which additional file content or build metadata would help.