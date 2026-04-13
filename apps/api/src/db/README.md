# apps/api/src/db

Plain-SQL migration baseline for the API service.

## 배치 규칙

- 마이그레이션 파일은 `migrations/NNNN_name.sql` 형식으로 추가한다.
- 각 파일은 PostgreSQL 15+ 구문을 기준으로 작성한다.
- state/status 컬럼은 `docs/03-api/state_transition_spec.md` 의 상태 집합과 동일한
  check constraint 를 사용한다 (native ENUM 대신 `text` + `check`).
- enum 변경 시에는 `state_transition_spec.md`, `openapi.yaml`,
  `packages/shared-types` 를 함께 갱신하고 대응 마이그레이션을 추가한다.

## 현재 baseline

`migrations/0001_baseline.sql` 는 다음 테이블을 생성한다.

- `core_organizations`
- `core_users`
- `core_repositories`
- `core_pull_requests` (`state` 는 business state machine, `github_state` 는 GitHub 원본)
- `integration_webhook_events`
- `integration_sync_jobs`

그 밖의 core_branches, core_commits, conflict_cases, backouts 등 도메인 테이블은
후속 phase 에서 단계적으로 추가한다 (phase 3, 7, 8).

## 실행 방법 (TODO)

Runner 는 아직 통합되지 않았다. 수동 적용 예시:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f apps/api/src/db/migrations/0001_baseline.sql
```

Phase 2 후반에 node-pg-migrate / drizzle-kit / pure-pg 중 하나로 runner 를 고정한다.
runner 결정 ADR 은 `docs/05-decisions/` 아래에 추가한다.
