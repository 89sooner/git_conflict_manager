# 01 Bootstrap Repo

## Goal

모노레포의 최소 실행 골격을 만든다.

## Read first

- `AGENTS.md`
- `plans/01_phase_order.md`
- `workflows/00_read_context.md`

## Steps

1. canonical directory structure 생성
2. `apps/web`, `apps/api`, `apps/worker`, `packages/*`, `tests/*` 생성
3. package manager 결정
4. workspace 설정
5. 공통 lint/typecheck/test 스크립트 추가
6. CI 기본 골격 추가
7. README와 run instructions 추가

## Output

- monorepo scaffold
- workspace config
- base scripts
- CI bootstrap

## Done when

- 루트에서 install 가능
- web/api/worker placeholder 실행 가능
- lint/typecheck 명령 존재
- 기본 CI job 실행 가능
