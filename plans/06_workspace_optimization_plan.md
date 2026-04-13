# 06 Workspace Optimization Plan

## 목적

이 문서는 현재 워크스페이스를 "문서 중심 bootstrap" 상태에서 "재현 가능하고 계약-구현 정합성이 확보된 구현 준비 상태"로 끌어올리기 위한 최적화 계획이다.

## 현재 진단

- 문서 대비 구현 비중이 크게 치우쳐 있다. 현재 기준으로 `docs/`는 9,678 line, `apps/`는 292 line 수준이며, OpenAPI에는 22개 엔드포인트가 정의되어 있지만 실제 구현은 `/health`와 `GET /api/v1/me`의 bootstrap 수준에 머물러 있다.
- 계약 드리프트가 존재한다.
  - `docs/03-api/internal_api_spec.md`는 `request_id`와 다른 `GET /api/v1/me` 응답 예시를 사용한다.
  - `docs/03-api/error_code_standard.md`는 `retryable`, `userAction`, `meta.timestamp`를 정의하지만 `docs/03-api/openapi.yaml`은 이를 충분히 반영하지 않는다.
  - Backout 상태 enum이 `openapi.yaml`, `state_transition_spec.md`, `packages/shared-types` 사이에서 다르게 정의되어 있다.
- 실행 재현성이 약하다.
  - `pnpm-lock.yaml`이 없고 `.gitignore`에 의해 무시되고 있다.
  - README와 CI는 `pnpm`을 전제로 하지만, 개발 환경 bootstrap 절차가 런타임 가용성을 보장하지 않는다.
- Phase 완료 조건이 아직 충족되지 않았다.
  - OpenAPI validation 부재
  - contract test baseline 부재
  - DB migration baseline 부재
  - 표준 error middleware 부재
  - task board가 예시 템플릿 수준에 머물러 있음

## 최적화 목표

1. 깨끗한 checkout 이후 `install`, `lint`, `typecheck`, `test`가 재현 가능하게 동작하도록 만든다.
2. `openapi.yaml`, `error_code_standard.md`, `state_transition_spec.md`, `packages/shared-types`, API runtime이 자동 검증 가능한 수준으로 일치하도록 만든다.
3. `plans/01_phase_order.md`의 Phase 1과 Phase 2 완료 조건을 실제로 만족할 수 있는 상태까지 끌어올린다.
4. 이후 GitHub App 연동과 읽기 모델 구현을 재작업 없이 시작할 수 있도록 기반을 고정한다.

## 최적화 원칙

- `docs/03-api/openapi.yaml`을 최종 API 계약으로 유지한다.
- 공통 enum과 타입은 독립적인 truth가 아니라 계약 문서와 상태 문서의 코드 미러로 유지한다.
- 기능 폭 확장보다 실행 가능하고 검증 가능한 얇은 기반을 우선한다.
- 데이터 의존 화면은 읽기 API가 준비되기 전까지 placeholder 범위만 유지한다.
- webhook 자동화는 idempotency와 저장 계층이 먼저 준비된 뒤에 시작한다.

## 실행 계획

### 1. 실행 환경 및 재현성 고정

- `pnpm-lock.yaml`을 커밋하고 `.gitignore`에서 제외한다.
- 런타임 기준을 Node 22 + `corepack` 기반 pnpm 10으로 고정한다.
- 루트에 `.nvmrc`를 추가하고, `README.md`에 WSL 기준 bootstrap 절차를 명시한다.
- CI는 lockfile이 생긴 이후 `--frozen-lockfile=false`에 의존하지 않도록 바꾼다.
- `node`, `corepack`, `pnpm` 부재 시 바로 실패하는 bootstrap check를 추가한다.

완료 기준:

- 새 환경에서 `corepack enable`, `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`를 재현 가능하게 실행할 수 있다.
- CI가 lockfile drift를 허용하지 않는다.

### 2. 계약 정합성 수습

- `docs/03-api/openapi.yaml`을 기준으로 보조 문서를 정리한다.
- `docs/03-api/internal_api_spec.md`는 최종 계약과 충돌하는 예시를 수정하거나, 충돌 구간을 reference-only로 명시한다.
- `openapi.yaml`의 에러 스키마에 `retryable`, `userAction`, `meta.timestamp`를 반영해 `error_code_standard.md`와 맞춘다.
- `GET /api/v1/me` 응답은 `data.user`, `data.permissions`, `meta.requestId` 구조로 고정한다.
- Backout API의 `status`는 `state_transition_spec.md`에 정의된 전체 상태 머신을 노출하도록 통일하고, 화면용 축약 상태가 필요하면 별도 파생 필드로 분리한다.
- `packages/shared-types`는 최종 계약에 맞춘 enum과 메타 타입만 노출하도록 정리한다.

완료 기준:

- `openapi.yaml`, `error_code_standard.md`, `state_transition_spec.md`, `packages/shared-types` 사이에 필드명과 enum 충돌이 남아 있지 않다.
- `internal_api_spec.md`가 현재 계약과 모순되지 않는다.

### 3. Phase 1 closeout: contract-first baseline

- OpenAPI validation 스크립트를 추가하고 CI에 연결한다.
- `tests/contract`에 최소 contract test를 추가한다.
  - `GET /api/v1/me` 성공 응답 envelope
  - 표준 error envelope
  - Backout 상태 enum 검증
- `apps/api/src/db/migrations` 아래에 plain SQL 기반 migration baseline을 추가한다.
- 첫 migration에는 최소한 아래 엔티티 및 enum을 포함한다.
  - organizations
  - users
  - repositories
  - pull_requests
  - webhook_events
  - sync_jobs
- PR/Backout 상태 enum은 `state_transition_spec.md`와 동일한 집합을 사용한다.

완료 기준:

- OpenAPI validation이 CI에서 실행된다.
- 최소 1개 이상의 contract test가 통과한다.
- migration baseline이 존재하고 상태 enum을 표현한다.

### 4. Phase 2 closeout: API foundation hardening

- `apps/api`를 `routes -> services -> repositories` 구조로 정리한다.
- Fastify 공통 계층을 추가한다.
  - request id 주입
  - 표준 error translation
  - typed auth placeholder
- `/health`는 비버전 운영용 엔드포인트로 유지하고, 제품 계약 바깥의 internal ops route로 문서화한다.
- `GET /api/v1/me`는 shared type과 표준 메타를 사용하도록 정비한다.
- `/api/v1/me`와 표준 error 응답에 대한 unit test를 추가한다.
- 이후 repository/branch/PR 읽기 모델을 수용할 수 있도록 base service/repository 레이어를 마련한다.

완료 기준:

- `health`와 `/api/v1/me`가 테스트로 보호된다.
- API 실패 응답이 표준 envelope를 사용한다.
- 추가 도메인 API를 붙여도 구조 재편이 필요 없을 정도의 골격이 준비된다.

### 5. 웹 셸 최소 정비

- `apps/web`에서 `@gsp/config`, `@gsp/shared-types`를 실제로 사용하기 시작한다.
- 현재 home-only 페이지를 최소 app shell로 확장한다.
  - layout
  - navigation placeholder
  - error/empty/loading shell
- `docs/04-frontend/frontend_badge_action_mapping.md`를 기준으로 공통 status badge 골격을 만든다.
- repository/PR 기능 페이지는 Phase 4 읽기 API가 준비되기 전까지 shell placeholder 범위만 구현한다.

완료 기준:

- 웹이 더 이상 고정 안내문만 렌더링하지 않는다.
- shared package import가 실제 코드 경로에 존재한다.
- shell 또는 status badge 기준의 테스트나 snapshot이 존재한다.

### 6. worker/GitHub integration 준비

- webhook normalization, sync job, risk analysis, backout validation에 필요한 event/job 타입을 shared-types로 정의한다.
- worker bootstrap을 단순 `console.log`에서 구조화된 startup path와 no-op job registry로 교체한다.
- webhook endpoint와 GitHub signature verification은 위 Phase 1/2 산출물이 끝난 뒤에 착수한다.

완료 기준:

- worker가 typed job contract를 가진다.
- Phase 3 구현이 shared event model 재작업 없이 시작 가능하다.

### 7. 운영 추적 및 문서 hygiene

- `plans/05_task_board.md`를 실제 작업 중심으로 채운다.
- 아래 ADR을 추가한다.
  - runtime/package management baseline
  - API error envelope standard
  - Backout status exposure strategy
- 현재 비어 있는 예약 영역에는 README 또는 placeholder를 추가해 의도를 명확히 한다.
  - `docs/05-decisions`
  - `packages/ui`
  - `packages/test-utils`
  - `tests/fixtures`

완료 기준:

- task board가 실작업 기준으로 관리된다.
- 비어 있는 예약 디렉터리가 방치된 상태로 보이지 않는다.

## 실행 순서

1. 실행 환경 및 재현성 고정
2. 계약 정합성 수습
3. OpenAPI validation + contract test + migration baseline
4. API foundation hardening
5. 웹 셸 최소 정비
6. worker typed bootstrap
7. Phase 3 GitHub App 연동 진입

## 최종 완료 판단

- 루트 명령이 깨끗한 환경에서 재현 가능하게 실행된다.
- 계약, 상태, 에러 문서와 shared types가 상호 충돌하지 않는다.
- API 기반 구조가 `plans/01_phase_order.md`의 Phase 2 완료 조건에 맞는다.
- task board가 실제 실행 가능한 backlog로 유지된다.
