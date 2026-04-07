# AGENTS.md

## Project truth order
1. docs/01-product/prd.md
2. docs/02-architecture/*
3. docs/03-api/openapi.yaml
4. docs/03-api/error_code_standard.md
5. docs/04-frontend/frontend_badge_action_mapping.md
6. plans/01_phase_order.md
7. workflows/*.md

## Working rules
- Do not change docs/01-product/prd.md unless explicitly asked.
- Treat docs/03-api/openapi.yaml as the API source of truth.
- Before coding, read plans/01_phase_order.md and the relevant workflow file.
- For each task, update plans/05_task_board.md.
- Do not start frontend implementation before contract endpoints exist.
- Do not start dashboard work before ingestion models and core APIs exist.

## Required checks
- Run unit tests for changed packages.
- Run contract validation if openapi.yaml changes.
- Update changelog/ADR when architecture changes.