# ADR-0002 · Mock Read Model 폐기 및 시드 데이터 일원화

- 상태: Accepted
- 작성일: 2026-04-26
- 작성자: gemini
- 관련 작업: T-021 (Gemini audit follow-up — mockReadModel 중복 제거)

## 맥락

Phase 4에서 API repository 레이어 스캐폴딩 시 `apps/api/src/data/mockReadModel.ts`를
하드코딩 fixture로 생성했다. Phase 6(T-017)에서 `@gsp/runtime-store` 패키지가 도입되면서
모든 repository 레이어(`repositoryRepository`, `branchRepository`, `pullRequestRepository`)가
runtime-store의 `readRuntimeStore()`를 직접 사용하도록 전환되었다.

이 시점에서 `mockReadModel.ts`는 **어디서도 import되지 않는 dead code**가 되었고,
runtime-store의 `createSeedRuntimeStoreSnapshot()` 함수에 동일한 시드 데이터가
별도로 존재하여 **404줄 규모의 중복**이 발생했다.

2026-04-17 Gemini 프로젝트 점검(이슈 #4)에서 이 중복이 식별되었고,
2026-04-18 Claude Code 보완 작업(T-020)에서 ADR-0003에 "Phase 8 DB 전환 시 삭제 예정"으로
기록했으나, 실제로는 Phase 6 시점에서 이미 사용처가 없었다.

## 결정

### 결정 1 — `mockReadModel.ts`를 즉시 삭제한다

- `apps/api/src/data/mockReadModel.ts` 파일을 삭제한다.
- `apps/api/src/data/` 디렉토리에 다른 파일이 없으므로 빈 디렉토리로 남긴다.

**근거**:

1. 전체 프로젝트에서 이 파일을 import하는 코드가 0건이다.
2. 동일 데이터가 `@gsp/runtime-store`의 `createSeedRuntimeStoreSnapshot()`에 존재한다.
3. 두 군데에 시드 데이터가 존재하면 한쪽만 수정 시 불일치가 발생할 수 있다.
4. ADR-0003에서 "Phase 8 전환 시 삭제"로 유예했지만, dead code를 유지할 이유가 없다.

### 결정 2 — 시드 데이터의 단일 원천은 `@gsp/runtime-store`이다

Phase 7까지 테스트·개발용 시드 데이터가 필요한 경우 `createSeedRuntimeStoreSnapshot()`을
단일 원천(single source of truth)으로 사용한다.

API 테스트에서 특정 시나리오용 fixture가 필요하면 해당 테스트 파일 내에
인라인으로 정의하고, `mockReadModel.ts` 같은 공유 fixture 파일을 재생성하지 않는다.

## 영향

- `apps/api/src/data/mockReadModel.ts` 삭제 (404줄 제거)
- API 빌드·테스트에 영향 없음 (import 0건 확인)
- ADR-0003의 "전환 시 작업 목록 §3 `mockReadModel.ts` 삭제" 항목은 이미 완료 상태

## 대안

| 대안 | 미채택 이유 |
|------|-----------|
| Phase 8까지 유지 (ADR-0003 원안) | dead code를 3개 phase 동안 방치할 이유가 없다 |
| 테스트 fixture 전용으로 리팩터링 | 이미 runtime-store에 동일 기능이 있으므로 중복 |
