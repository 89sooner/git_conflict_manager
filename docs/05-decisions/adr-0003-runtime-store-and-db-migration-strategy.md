# ADR-0003 · Runtime Store 채택 및 DB 마이그레이션 전략

- 상태: Accepted
- 작성일: 2026-04-18
- 작성자: claude
- 관련 작업: T-017 (Phase 6 PR pipeline), T-020 (Gemini 리뷰 보완)

## 맥락

Phase 2에서 PostgreSQL 스키마 문서(`docs/02-architecture/data_model_and_db_schema.md`)와
마이그레이션 SQL(`apps/api/src/db/migrations/`)을 작성했다. 그러나 Phase 5-6 구현에서
실제 API와 worker는 PostgreSQL 대신 `@gsp/runtime-store` (JSON 파일 기반 저장소)를 사용한다.

이 결정의 근거와 전환 시점을 문서화하지 않아 아키텍처 추적성 공백이 생겼다. 본 ADR이 이를 보완한다.

## 결정

### 결정 1 — MVP 기간(Phase 5-7)은 `@gsp/runtime-store`를 사용한다

`@gsp/runtime-store`는 OS tmpdir의 단일 JSON 파일(`GSP_RUNTIME_STORE_FILE`, 기본값: `/tmp/gsp-runtime-store.json`)을
읽고 쓰는 경량 in-process 저장소다.

**근거**:

1. DB 인프라(PostgreSQL, 마이그레이션 실행 환경) 없이 전체 데이터 흐름을 즉시 검증할 수 있다.
2. Phase 1-4에서 계약(openapi.yaml, shared-types, error envelope)을 먼저 확정했으므로,
   저장 계층은 계약 검증 이후 교체해도 안전하다.
3. 시드 데이터가 포함되어 있어 별도 fixture 관리 없이 개발·테스트 환경이 동작한다.
4. worker의 sync job 큐(`syncJobs` 배열)와 PR 분석 결과를 단일 파일로 관리해 프로세스 간
   공유가 가능하다 (단일 서버 환경 한정).

**제한 사항 (알고 받아들임)**:

- 프로세스 재시작 시 syncJobs 큐가 유실될 수 있다 (JSON 파일이 삭제되거나 초기화되는 경우).
- 다중 워커 프로세스 동시 실행 시 파일 I/O 경쟁 조건이 발생할 수 있다.
- Phase 8 이후 요구되는 트랜잭션, 인덱스, 외래키 무결성을 제공하지 않는다.

### 결정 2 — Phase 8 (Backout) 착수 전 PostgreSQL로 전환한다

**전환 트리거 (다음 중 하나가 발생하면 즉시 전환)**:

- Phase 7 conflict case 구현 시 `core_conflict_cases` 등 신규 엔티티가 필요해지는 시점
- syncJobs 큐 유실이 실제 테스트에서 문제가 되는 시점
- 다중 worker 인스턴스 테스트 착수 시점

**전환 시 작업 목록**:

1. migration 파일 적용 (`0001_baseline.sql`, `0002_pr_analysis_read_models.sql`)
2. `@gsp/runtime-store` 의존 코드를 Drizzle ORM 또는 pg 직접 쿼리로 교체
3. ~~`apps/api/src/data/mockReadModel.ts` stub 삭제~~ (완료 — ADR-0002 참조)
4. worker `pullRequestAnalysis.ts`의 결과를 DB 테이블에 저장하도록 변경
5. runtime-store 패키지를 devDependency로 강등하거나 테스트 fixture 전용으로 격리

### 결정 3 — worker 분석 결과는 Phase 7까지 runtime-store에 쓴다

Phase 6 worker(`apps/worker/src/jobs/pullRequestAnalysis.ts`)의 `buildRiskAnalysis()`와
`buildReviewRecommendations()` 결과는 현재 메모리에서만 처리되고 저장되지 않는다.

Phase 7 구현 시 `updateRuntimeStore()`를 통해 runtime-store에 결과를 저장하고,
Phase 8 DB 전환 시점에 DB 테이블 쓰기로 교체한다.

### 결정 4 — runtime-store를 영구 운영 저장소로 사용하지 않는다

Phase 10 hardening 진입 전까지 PostgreSQL 전환을 완료해야 한다.
runtime-store가 Phase 10 이후에도 남아 있다면 아키텍처 부채로 간주한다.

## 대안

| 대안 | 이유로 미채택 |
|------|------------|
| Phase 2에서 즉시 PostgreSQL 사용 | DB 인프라 준비 지연이 계약 검증 착수를 막는다 |
| SQLite 파일 기반 DB | PostgreSQL 마이그레이션을 두 번 거쳐야 한다 |
| Redis 큐 + PostgreSQL | Phase 5-7 규모에서는 과잉. 큐 내구성은 Phase 8부터 필요 |

## 후속 작업

- Phase 7 진입 시 worker 분석 결과를 runtime-store에 저장하도록 `pullRequestAnalysis.ts` 보완
- Phase 8 착수 시 PostgreSQL 전환 태스크를 task board에 등록하고 본 ADR 상태를 `Superseded`로 갱신
- Phase 10 hardening ADR(ADR-0004+)에서 운영 DB 구성 결정을 기록
