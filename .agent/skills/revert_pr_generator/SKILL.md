---
name: revert-pr-generator
description: generate a safe revert or backout pr without rewriting remote repository history. use when chatgpt needs to roll back a problematic commit or pr during an operational incident, check whether later commits depend on the target change, estimate revert conflict risk, prepare a revert branch, or open a backout pr with the original change and incident reason clearly documented.
---

# revert pr generator

Generate a safe revert or backout pull request for an incident response workflow without force-pushing or rewriting shared remote history.

Do not recommend history-rewriting operations such as force push, reset, or rebase against shared protected branches unless the user explicitly asks for emergency alternatives and the environment policy allows it.
Prefer revert-based recovery on shared branches.
Do not claim that a branch or pull request was created unless the tool action actually succeeded.

## workflow

1. Identify the target change to revert:
   - commit sha
   - pull request number
   - branch
   - repository
2. Inspect the target change and summarize what it introduced.
3. Check whether later commits depend on the target change by looking for:
   - follow-up fixes
   - changed call sites
   - interface assumptions
   - dependent config or schema updates
   - chained refactors
4. Estimate revert safety and conflict risk:
   - clean revert likely
   - revert likely needs manual conflict resolution
   - revert likely unsafe without reverting dependent changes together
5. If the revert is viable, create a revert or backout branch using a revert-based workflow rather than rewriting branch history.
6. Open a backout pull request that includes:
   - the original commit or pr reference
   - the incident or ticket reference
   - the reason for rollback
   - expected impact
   - any follow-up work required
7. Summarize the created revert plan or the blocker that prevented safe automation.

## analysis rules

When checking commit dependencies, prioritize evidence such as:

- later commits touching the same files or symbols
- interface or signature changes introduced after the target change
- follow-up fixes that assume the target code exists
- tests added after the target change that depend on the target behavior
- config, migration, schema, or deployment changes linked to the target change
- release or hotfix commits that partially modify the same behavior

Treat a revert as higher risk when:

- the target change has been partially modified by later commits
- the target change changed shared interfaces
- the target change introduced migrations, schema changes, or persistent state changes
- the target change altered deployment or infrastructure behavior
- the target change spans multiple subsystems or repositories

Prefer reverting the smallest safe unit.
If the original change was a merged pull request with multiple commits, determine whether the safe rollback unit is:
- a single commit
- the full pull request
- the pull request plus one or more dependent follow-up commits

## pr content rules

When preparing the backout pr, include:

- original change identifier
- incident or ticket link if provided
- concise rollback reason
- risk or dependency notes
- validation notes or required checks
- follow-up remediation items if known

Keep the title direct and searchable.

Recommended title patterns:

- revert "<original pr title>"
- backout: <short incident summary>
- revert <short component summary> due to <incident id>

Recommended body sections:

- summary
- original change
- reason for revert
- dependency or conflict notes
- validation
- follow-up actions

## output requirements

Report results in this order:

1. target change identification
2. dependency assessment
3. revert risk assessment
4. planned or completed revert action
5. backout pr content summary
6. blockers or follow-up actions

Separate confirmed facts from inference.
If automation could not safely proceed, explain exactly why.

## output format

Use a structure like this:

Target Change:
- repository: <repo>
- target: <commit sha or pr number>
- branch: <branch>

Dependency Assessment:
- <no dependent commits found / dependent commits found / unclear>
- <key evidence>

Revert Risk:
- <low / medium / high>
- <reason tied to overlapping commits, interfaces, schema, config, or runtime behavior>

Action:
- <revert branch created / backout pr created / manual intervention required / no write action performed>

Backout PR Summary:
- title: <proposed or actual title>
- original change: <commit sha or pr link>
- incident reference: <ticket url or none>
- reason: <rollback reason>

Follow-up Actions:
- <required validation or manual review>
- <additional commits that may also need revert>

## failure handling

If the repository, branch, or target identifier is missing, infer it from context when reliable.
If inference is not reliable, state what is missing before any write action.
If dependency analysis is inconclusive, mark the result as unclear and explain what additional history or repository context is needed.
If the environment does not expose a git or github write-capable tool, provide the revert plan and draft pr content without claiming execution.