# Git Migration Support Platform Monorepo

이 저장소는 GitHub Enterprise 전환 지원 및 품질 운영 플랫폼의 구현 워크스페이스다.

## 권장 기술 스택

- Package manager: pnpm
- Monorepo orchestration: Turborepo
- Language: TypeScript
- Web: Next.js
- API: Fastify
- Worker: Node.js + TypeScript
- DB: PostgreSQL
- Contract: OpenAPI 3.1
- Testing: Vitest + Playwright + contract tests

## 디렉토리 구조

```text
docs/        기준 문서
plans/       구현 순서와 완료 조건
workflows/   에이전트 작업 절차
apps/web/    개발자 포털 / 운영 UI
apps/api/    REST API / webhook entrypoint
apps/worker/ 비동기 분석 / sync worker
packages/    공통 타입 / 설정
tests/       계약 / 통합 / E2E 테스트
```

## 문서 배치 규칙

다음 파일을 아래 경로로 옮겨 배치한다.

- `prd.md` -> `docs/01-product/prd.md`
- `github_app_integration_design.md` -> `docs/02-architecture/github_app_integration_design.md`
- `data_model_and_db_schema.md` -> `docs/02-architecture/data_model_and_db_schema.md`
- `internal_api_spec.md` -> `docs/03-api/internal_api_spec.md`
- `openapi_3_1_spec_draft.md` -> `docs/03-api/openapi_3_1_spec_draft.md`
- `openapi.yaml` -> `docs/03-api/openapi.yaml`
- `error_code_standard.md` -> `docs/03-api/error_code_standard.md`
- `state_transition_spec.md` -> `docs/03-api/state_transition_spec.md`
- `frontend_badge_action_mapping.md` -> `docs/04-frontend/frontend_badge_action_mapping.md`

그리고 `implementation_bootstrap/`에서 만든 아래 파일들을 루트에 반영한다.

- `AGENTS.md`
- `plans/*`
- `workflows/*`
- `apps/api/AGENTS.md`
- `apps/web/AGENTS.md`
- `apps/worker/AGENTS.md`

## 시작 순서

1. `AGENTS.md` 확인
2. `plans/01_phase_order.md` 확인
3. `workflows/00_read_context.md` 확인
4. `workflows/01_bootstrap_repo.md` 순서로 실행
5. 그 다음 `workflows/02_backend_contract_first.md`
6. 그 다음 `workflows/03_github_app_integration.md`

## 런타임 요구사항

- Node.js 22 (`.nvmrc` 참조, `nvm use` 또는 `fnm use` 권장)
- Corepack 활성화 후 pnpm 10 (`package.json`의 `packageManager` 필드 기준)
- PostgreSQL 15+ (추후 Phase 3 이후 필요)

## Bootstrap (WSL / Linux)

```bash
nvm use                  # .nvmrc 기준 Node 22 활성화
corepack enable          # pnpm 프로비저닝
corepack prepare pnpm@10.0.0 --activate
pnpm install --frozen-lockfile
```

최초 체크아웃에서는 `pnpm-lock.yaml`이 저장소에 고정되어 있어야 하며, lockfile drift가 발생하면 CI가 실패한다.

## 개발 명령

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm dev
```

## 앱 실행 명령

```bash
pnpm --filter @gsp/api dev
pnpm --filter @gsp/web dev
pnpm --filter @gsp/worker dev
```

### 로컬 개발 환경 변수

웹 셸은 서버/클라이언트 base URL과 dev 인증 사용자를 분리해서 읽는다.

```bash
# apps/api 가 노출하는 내부 주소 (server component 에서 사용)
export API_BASE_URL_INTERNAL=http://localhost:4000

# 브라우저(Client component) 가 사용하는 공개 주소
export NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

# Phase 10 SSO 도입 전, dev 인증 게이트
export GSP_DEV_USER=bootstrap
```

`GSP_DEV_USER=bootstrap` 이 설정되면 `apps/web` 이 모든 API 호출에
`x-gsp-dev-user: bootstrap` 헤더를 주입하고, AppShell 우측에 bootstrap dev user 가 표시된다.
이 변수를 비우면 헤더가 누락되고 미인증 상태로 표시된다.

## 참고

현재 scaffold는 초기 골격만 포함한다.
실제 구현은 문서 계약을 기준으로 진행한다.
