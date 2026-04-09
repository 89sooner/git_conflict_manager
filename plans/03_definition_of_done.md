# 03 Definition of Done

## 공통 DoD

1. 관련 코드 구현 완료
2. 테스트 통과
3. lint/typecheck 통과
4. 관련 문서 갱신
5. task board 갱신
6. scope 밖 변경 없음

## 기능별 추가 DoD

### API
- contract test 추가
- 에러 코드 매핑 검증

### Web
- 상태 배지/액션 패널 규칙 반영
- error/empty/loading 처리 포함

### Worker
- 멱등성 검증
- 실패 재시도 또는 dead-letter 처리 기준 명시
