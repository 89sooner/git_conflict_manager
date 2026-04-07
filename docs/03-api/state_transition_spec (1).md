# 상태 전이 설계 문서

## 1. 문서 목적

이 문서는 GitHub Enterprise 전환 지원 웹 도구의 핵심 도메인 객체가 어떤 상태를 가지며, 어떤 이벤트에 의해 상태가 바뀌는지를 정의한다.

본 문서의 목적은 다음과 같다.

1. 프론트엔드, 백엔드, 분석 워커, 운영 도구가 같은 상태 모델을 공유하게 한다.
2. 화면 노출 상태와 내부 처리 상태를 분리해서 정의한다.
3. 잘못된 상태 전이, 중복 실행, race condition을 줄인다.
4. 알림, 감사 로그, 권한 제어 기준을 상태 전이에 맞춰 정리한다.

## 2. 공통 설계 원칙

1. 상태는 사용자에게 보이는 비즈니스 상태와 내부 시스템 처리 상태를 구분한다.
2. 상태 전이는 명시적인 이벤트에 의해서만 발생한다.
3. 모든 상태 전이는 감사 로그와 함께 기록되어야 한다.
4. 실패 상태는 재시도 가능 여부를 분리해서 표현한다.
5. 외부 시스템 이벤트와 내부 사용자 액션은 구분해서 저장한다.
6. 되돌릴 수 있는 상태와 되돌릴 수 없는 상태를 명확히 정의한다.

## 3. 공통 전이 메타데이터

모든 상태 전이 이벤트는 아래 공통 메타데이터를 가진다.

- entity_type
- entity_id
- previous_state
- next_state
- event_type
- event_source
- actor_type
- actor_id
- occurred_at
- correlation_id
- reason
- payload_snapshot

## 4. Pull Request 상태 전이

### 4.1 상태 정의

Pull Request의 비즈니스 상태는 다음과 같이 정의한다.

- draft
- open
- under-review
- changes-requested
- approved
- merge-blocked
- ready-to-merge
- queued-for-merge
- merged
- closed
- reverted

설명:

- draft: 작성 중이며 정식 리뷰 대상으로 보지 않는 상태
- open: 오픈되었으나 리뷰 준비 상태가 완전히 충족되지 않은 상태
- under-review: 리뷰 진행 중인 상태
- changes-requested: 수정 요청이 존재하는 상태
- approved: 필수 승인 조건은 충족했으나 아직 병합 가능 여부가 남은 상태
- merge-blocked: 승인되었더라도 필수 체크 실패, 정책 위반, 충돌 등으로 병합 불가능한 상태
- ready-to-merge: 승인과 체크, 정책 조건을 만족한 상태
- queued-for-merge: merge queue에 들어간 상태
- merged: 병합 완료 상태
- closed: 병합 없이 닫힌 상태
- reverted: 병합된 PR이 나중에 backout/revert된 상태

### 4.2 주요 이벤트

- pr_created_as_draft
- pr_marked_ready
- reviewer_requested
- review_submitted_comment
- review_submitted_approve
- review_submitted_request_changes
- required_checks_passed
- required_checks_failed
- policy_violation_detected
- conflicts_detected
- conflicts_resolved
- merge_queue_entered
- merge_queue_removed
- pr_merged
- pr_closed_without_merge
- pr_reopened
- pr_reverted

### 4.3 상태 전이 표

| 현재 상태 | 이벤트 | 다음 상태 | 비고 |
|---|---|---|---|
| 없음 | pr_created_as_draft | draft | 신규 생성 |
| 없음 | pr_marked_ready | open | 즉시 오픈 |
| draft | pr_marked_ready | open | 리뷰 시작 가능 |
| open | reviewer_requested | under-review | 리뷰 요청 시작 |
| under-review | review_submitted_request_changes | changes-requested | 수정 필요 |
| changes-requested | new_commits_pushed | under-review | 재검토 요청 |
| under-review | review_submitted_approve | approved | 승인 조건 일부/전체 충족 |
| approved | required_checks_failed | merge-blocked | 체크 실패 |
| approved | policy_violation_detected | merge-blocked | 정책 위반 |
| approved | conflicts_detected | merge-blocked | 병합 충돌 |
| merge-blocked | required_checks_passed + no_conflicts + no_policy_violation | ready-to-merge | 조건 회복 |
| approved | required_checks_passed + no_conflicts + no_policy_violation | ready-to-merge | 즉시 병합 가능 |
| ready-to-merge | merge_queue_entered | queued-for-merge | queue 사용 시 |
| ready-to-merge | pr_merged | merged | queue 미사용 시 |
| queued-for-merge | merge_queue_removed | ready-to-merge 또는 merge-blocked | 제거 사유 따라 분기 |
| queued-for-merge | pr_merged | merged | 정상 병합 |
| open/under-review/changes-requested/approved/merge-blocked/ready-to-merge | pr_closed_without_merge | closed | 사용자 또는 시스템에 의해 종료 |
| closed | pr_reopened | open | 재오픈 |
| merged | pr_reverted | reverted | backout/revert 연결 시 |

### 4.4 상태 머신 요약

```text
draft -> open -> under-review -> approved -> ready-to-merge -> queued-for-merge -> merged
                    |              |              |
                    v              v              v
             changes-requested  merge-blocked   closed
```

### 4.5 화면 표시 규칙

- draft: 회색 배지
- under-review: 파란 배지
- changes-requested: 주황 배지
- approved: 초록 배지
- merge-blocked: 빨간 배지
- queued-for-merge: 보라 배지
- merged: 진한 초록 배지
- reverted: 빨간 테두리와 함께 표시

## 5. PR 위험도 분석 상태 전이

### 5.1 상태 정의

- not-requested
- queued
- running
- succeeded
- partial
- failed
- stale

설명:

- not-requested: 아직 분석이 생성되지 않음
- queued: 작업 큐에 들어감
- running: 분석 중
- succeeded: 정상 완료
- partial: 일부 신호만 계산 완료
- failed: 실패
- stale: PR 업데이트로 결과가 낡아짐

### 5.2 이벤트

- analysis_requested
- worker_started
- worker_completed
- worker_completed_partial
- worker_failed
- source_pr_updated

### 5.3 상태 전이 표

| 현재 상태 | 이벤트 | 다음 상태 |
|---|---|---|
| not-requested | analysis_requested | queued |
| queued | worker_started | running |
| running | worker_completed | succeeded |
| running | worker_completed_partial | partial |
| running | worker_failed | failed |
| succeeded/partial | source_pr_updated | stale |
| stale/failed | analysis_requested | queued |

## 6. Conflict Case 상태 전이

### 6.1 상태 정의

- detected
- analyzing
- guided
- user-working
- resolved
- aborted
- stale

설명:

- detected: 충돌 케이스가 감지되었으나 분석 전
- analyzing: 충돌 유형/파일/가이드 분석 중
- guided: 사용자에게 가이드 제공 준비 완료
- user-working: 사용자가 해결 작업 중으로 표시
- resolved: 해결됨
- aborted: 작업 중단
- stale: 원본 브랜치/PR 갱신으로 기존 충돌 정보가 유효하지 않음

### 6.2 유형

- merge
- rebase
- cherry-pick
- modify-delete
- rename

### 6.3 이벤트

- conflict_detected
- guidance_generation_started
- guidance_ready
- user_started_resolution
- user_marked_resolved
- source_context_changed
- operation_aborted

### 6.4 상태 전이 표

| 현재 상태 | 이벤트 | 다음 상태 | 비고 |
|---|---|---|---|
| 없음 | conflict_detected | detected | 최초 감지 |
| detected | guidance_generation_started | analyzing | 분석 시작 |
| analyzing | guidance_ready | guided | 가이드 제공 가능 |
| guided | user_started_resolution | user-working | 해결 진행 |
| user-working | user_marked_resolved | resolved | 사용자 확인 또는 시스템 검증 |
| detected/analyzing/guided/user-working | operation_aborted | aborted | merge/rebase/cherry-pick 중단 |
| detected/analyzing/guided/user-working | source_context_changed | stale | 브랜치/PR 맥락 변경 |
| stale | conflict_detected | detected | 재계산 |

### 6.5 주의점

1. resolved는 실제 Git 결과 검증과 분리될 수 있다.
2. stale 상태는 숨기지 말고 재분석 버튼을 제공해야 한다.
3. aborted는 실패가 아니라 사용자가 안전하게 중단한 상태로 취급해야 한다.

## 7. Backout / Revert 상태 전이

### 7.1 상태 정의

- draft
- validating
- pending-approval
- approved
- blocked
- ready
- pr-generating
- pr-open
- queued-for-merge
- merged
- failed
- cancelled

설명:

- draft: 요청 작성 중
- validating: 대상 PR/commit, 영향 범위, 정책 검증 중
- pending-approval: 승인 대기
- approved: 승인 완료
- blocked: 충돌 위험, 권한 부족, 정책 누락 등으로 진행 차단
- ready: revert PR 생성 가능
- pr-generating: revert PR 생성 작업 중
- pr-open: revert PR이 생성되어 오픈됨
- queued-for-merge: revert PR이 merge queue에 들어감
- merged: backout 완료
- failed: 생성 또는 병합 실패
- cancelled: 요청 취소

### 7.2 이벤트

- backout_created
- validation_started
- validation_passed
- validation_failed
- approval_requested
- approval_granted
- approval_rejected
- blocker_resolved
- generate_revert_pr_requested
- revert_pr_created
- revert_pr_generation_failed
- revert_pr_queued
- revert_pr_merged
- backout_cancelled

### 7.3 상태 전이 표

| 현재 상태 | 이벤트 | 다음 상태 | 비고 |
|---|---|---|---|
| 없음 | backout_created | draft | 신규 요청 |
| draft | validation_started | validating | 입력 완료 후 검증 시작 |
| validating | validation_failed | blocked | 충돌 가능성, 정책 부족 등 |
| validating | validation_passed + approval_required | pending-approval | 승인 필요 |
| validating | validation_passed + no_approval_required | ready | 바로 생성 가능 |
| pending-approval | approval_granted | approved | 승인 완료 |
| pending-approval | approval_rejected | blocked | 반려 |
| approved | blocker_resolved 또는 implicit | ready | 준비 완료 |
| blocked | blocker_resolved | ready 또는 pending-approval | 원인에 따라 분기 |
| ready | generate_revert_pr_requested | pr-generating | PR 생성 시작 |
| pr-generating | revert_pr_created | pr-open | 생성 성공 |
| pr-generating | revert_pr_generation_failed | failed | 생성 실패 |
| pr-open | revert_pr_queued | queued-for-merge | queue 사용 시 |
| pr-open | revert_pr_merged | merged | 직접 병합 시 |
| queued-for-merge | revert_pr_merged | merged | queue 병합 |
| draft/blocked/pending-approval/approved/ready/failed | backout_cancelled | cancelled | 종료 |

### 7.4 운영 규칙

1. release 브랜치 대상이면 pending-approval을 생략할 수 없다.
2. revert PR 생성 전에 reason과 incident ticket 유효성을 점검해야 한다.
3. merged 상태가 되면 원본 PR 또는 원본 commit 집합과 링크를 고정해야 한다.
4. failed는 시스템 실패이며, 사용자가 취소한 경우는 cancelled로 구분한다.

### 7.5 상태 머신 요약

```text
draft -> validating -> pending-approval -> approved -> ready -> pr-generating -> pr-open -> queued-for-merge -> merged
                      |                    |          |
                      v                    v          v
                    blocked <----------- failed     cancelled
```

## 8. Policy Template 상태 전이

### 8.1 상태 정의

- draft
- active
- deprecated
- archived

설명:

- draft: 작성 중이며 아직 적용 전
- active: 적용 가능한 정책 템플릿
- deprecated: 새 적용은 지양하지만 기존 참조 유지
- archived: 더 이상 사용하지 않는 상태

### 8.2 이벤트

- template_created
- template_published
- template_deprecated
- template_archived
- template_restored

### 8.3 상태 전이 표

| 현재 상태 | 이벤트 | 다음 상태 |
|---|---|---|
| 없음 | template_created | draft |
| draft | template_published | active |
| active | template_deprecated | deprecated |
| deprecated | template_published | active |
| deprecated | template_archived | archived |
| archived | template_restored | deprecated 또는 active |

## 9. Policy Assignment 상태 전이

정책 템플릿과 실제 저장소/브랜치 적용은 별도 상태가 필요하다.

### 9.1 상태 정의

- pending
- applying
- active
- failed
- revoked

### 9.2 이벤트

- assignment_created
- apply_started
- apply_succeeded
- apply_failed
- assignment_revoked

### 9.3 상태 전이 표

| 현재 상태 | 이벤트 | 다음 상태 |
|---|---|---|
| 없음 | assignment_created | pending |
| pending | apply_started | applying |
| applying | apply_succeeded | active |
| applying | apply_failed | failed |
| failed | apply_started | applying |
| active | assignment_revoked | revoked |

## 10. Job 상태 전이

### 10.1 상태 정의

- queued
- running
- succeeded
- failed
- cancelled
- expired

설명:

- queued: 큐에 적재됨
- running: 워커가 실행 중
- succeeded: 완료
- failed: 실패
- cancelled: 명시적으로 취소됨
- expired: TTL 또는 결과 보관 기간 만료

### 10.2 이벤트

- job_enqueued
- worker_claimed
- worker_finished
- worker_failed
- job_cancelled
- job_expired

### 10.3 상태 전이 표

| 현재 상태 | 이벤트 | 다음 상태 |
|---|---|---|
| 없음 | job_enqueued | queued |
| queued | worker_claimed | running |
| running | worker_finished | succeeded |
| running | worker_failed | failed |
| queued/running | job_cancelled | cancelled |
| succeeded/failed/cancelled | job_expired | expired |

### 10.4 구현 원칙

1. queued -> running 전이는 워커 락과 함께 원자적으로 처리해야 한다.
2. running 상태는 heartbeat가 없으면 watchdog이 failed 또는 queued 재전환 여부를 판단해야 한다.
3. expired는 사용자 화면 기본 목록에서 숨길 수 있으나 감사 로그에서는 남겨야 한다.

## 11. Notification 상태 전이

### 11.1 상태 정의

- pending
- sending
- delivered
- failed
- acknowledged
- suppressed

설명:

- pending: 발송 대기
- sending: 발송 시도 중
- delivered: 외부 채널 전달 성공
- failed: 실패
- acknowledged: 사용자가 확인
- suppressed: 중복, 정책, 사용자 설정으로 인해 발송 생략

### 11.2 이벤트

- notification_created
- delivery_started
- delivery_succeeded
- delivery_failed
- user_acknowledged
- notification_suppressed

## 12. UI 배지와 상태 매핑 원칙

### 12.1 배지 규칙

- 초록: 완료 가능 또는 정상 완료
- 파랑: 진행 중
- 주황: 사용자 조치 필요
- 빨강: 차단 또는 실패
- 회색: 임시, 초안, 종료, 만료

### 12.2 우측 액션 패널 규칙

상태에 따라 항상 다음 액션을 최대 3개만 노출한다.

예시:

- PR merge-blocked: 체크 재실행, 충돌 가이드 열기, 정책 위반 보기
- Conflict guided: 해결 시작, 관련 플레이북 보기, 도움 요청
- Backout pending-approval: 승인자 지정, 사유 수정, 취소
- Backout blocked: 차단 원인 보기, 검증 재실행, 예외 요청

## 13. 권한과 상태 전이 제약

### 13.1 일반 개발자

가능:
- draft PR 생성
- conflict 해결 진행 상태 변경
- backout 요청 생성
- backout 취소

불가:
- release backout 승인
- 정책 템플릿 활성화
- 조직 전체 정책 적용

### 13.2 리뷰어

가능:
- PR 리뷰 상태 전이에 영향
- 승인 또는 변경 요청

불가:
- 정책 템플릿 배포
- 시스템 job 강제 종료

### 13.3 운영자/플랫폼 관리자

가능:
- 정책 활성화/비활성화
- 예외 승인
- release backout 승인
- 재분석 강제 실행

## 14. 감사 로그 요구사항

아래 상태 전이는 반드시 감사 이벤트를 생성해야 한다.

1. PR merged
2. PR reverted
3. Backout created
4. Backout approved
5. Backout merged
6. Policy template published
7. Policy assignment active
8. Release 관련 충돌 또는 backout 상태 변화
9. 권한 거부로 인한 blocked 전이

감사 로그에는 최소 아래가 포함되어야 한다.

- 누가
- 무엇을
- 언제
- 어떤 이유로
- 어떤 상태에서 어떤 상태로 바꿨는지
- 관련 엔티티 링크
- 요청 ID와 외부 시스템 correlation ID

## 15. 운영 알림 연결 규칙

상태 변화가 알림을 발생시키는 대표 예시는 다음과 같다.

| 엔티티 | 전이 | 알림 대상 |
|---|---|---|
| PR | under-review -> changes-requested | 작성자 |
| PR | approved -> merge-blocked | 작성자, 리뷰어 |
| PR | ready-to-merge -> queued-for-merge | 작성자 |
| Conflict | analyzing -> guided | 요청자 |
| Backout | validating -> pending-approval | 승인자 |
| Backout | pr-open -> queued-for-merge | 요청자, 운영자 |
| Backout | queued-for-merge -> merged | 요청자, 운영자, 관련 팀 |
| Policy Assignment | applying -> failed | 운영자 |
| Job | running -> failed | 운영자 또는 요청자 |

## 16. 구현 시 주의사항

1. 하나의 엔티티에 대해 화면 상태와 저장 상태를 혼동하지 않아야 한다.
2. GitHub 외부 이벤트와 내부 사용자 액션이 동시에 들어올 수 있으므로 optimistic UI만으로 상태를 확정하면 안 된다.
3. merge queue와 required checks의 상태는 GitHub 이벤트 반영 지연을 고려해야 한다.
4. 동일 이벤트 중복 수신에 대비해 상태 전이 처리는 멱등해야 한다.
5. stale 상태를 무시하면 잘못된 가이드와 잘못된 backout 제안이 발생할 수 있다.

## 17. MVP에서 우선 고정해야 할 상태 머신

MVP 범위에서 반드시 먼저 구현하고 테스트해야 하는 상태 머신은 아래와 같다.

1. Pull Request
2. PR 위험도 분석 Job
3. Conflict Case
4. Backout / Revert
5. Job
6. Notification

## 18. 다음 단계 권장

이 문서 다음 단계로는 아래를 권장한다.

1. 상태 전이를 반영한 DB enum 및 transition history 테이블 구체화
2. 상태 전이 검증 로직을 서비스 계층 인터페이스로 추출
3. 프론트엔드 상태 배지와 액션 버튼 매핑표 작성
4. 상태 전이 기반 운영 알림 룰셋 문서화
5. 계약 테스트 케이스 작성
