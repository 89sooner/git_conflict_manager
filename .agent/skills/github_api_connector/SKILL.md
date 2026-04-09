---
name: github-api-connector
description: inspect github enterprise pull requests, changed files, reviews, checks, commits, and branch protection settings. use when chatgpt needs to evaluate pr merge readiness, summarize review status, verify ci or cd results, inspect repository policy constraints, or post a safe pull request comment through an available github enterprise connector or tool.
---

# github api connector

Use the available GitHub Enterprise connector or tool in the environment to inspect repository, pull request, commit, check, and branch protection data.

Do not invent tool names or api responses.
Do not claim that a write action succeeded unless the tool call actually succeeded.
Prefer repository data over assumptions.

## workflow

1. Identify the repository, pull request number, target branch, or commit sha from the user request.
2. If the request is about a pull request, inspect:
   - changed files
   - review status
   - check or workflow results
   - mergeability or blocking conditions if available
3. If the request is about repository policy, inspect the target branch protection settings, including:
   - force push restrictions
   - required approving reviews
   - required status checks
   - other merge restrictions if available
4. If the request is about commit or check status, inspect the relevant commit, workflow, or check run data.
5. Summarize the result in a concise engineering report.
6. If the user asks to comment on a pull request, generate a factual and safe comment, then post it only through an available write-capable tool.

## response rules

When summarizing a pull request, report the result in this order:

1. repository and pull request identification
2. review status
3. ci or cd check status
4. branch protection or merge policy status
5. final merge-readiness assessment
6. blockers or follow-up actions

State each blocker explicitly.
Separate confirmed facts from inferences.
When data is missing, say exactly what could not be retrieved.

## comment rules

When posting a pull request comment:

- keep the tone neutral and professional
- include only verified findings
- do not accuse or speculate
- do not expose secrets, tokens, or internal credentials
- keep the comment short unless the user requests a detailed review
- if the tool supports draft-like behavior, prefer drafting before posting when the request is ambiguous

## output format

Use a structure like this:

Repository: <repo name>
Pull Request: <pr number or url>

Summary:
<one to three sentence summary>

Review Status:
- <approved / changes requested / pending / unknown>
- <key detail>

Checks:
- <passed / failed / pending / unknown>
- <key detail>

Branch Protection:
- <required reviews>
- <required checks>
- <force push policy>
- <other relevant rule>

Assessment:
- <merge ready / not merge ready / needs manual confirmation>

Blockers:
- <explicit blocker 1>
- <explicit blocker 2>

Recommended Next Action:
- <next step>

## failure handling

If the required connector or tool is unavailable, say that the environment does not currently expose a GitHub Enterprise tool for that action.
If identifiers are missing, infer them from context when possible.
If inference is not reliable, state what identifier is missing and stop before making write actions.