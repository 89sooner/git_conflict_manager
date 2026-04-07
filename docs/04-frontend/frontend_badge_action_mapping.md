# 프론트엔드 상태 배지 / 액션 버튼 매핑 문서

## 1. 문서 목적

이 문서는 GitHub Enterprise 전환 지원 웹 도구의 프론트엔드에서 상태를 어떻게 시각적으로 표현하고, 상태별로 어떤 액션 버튼을 어떤 우선순위와 제약으로 노출할지 정의한다.

본 문서의 목적은 다음과 같다.

1. 화면 간 상태 표현 일관성을 확보한다.
2. 같은 상태에서 화면마다 다른 버튼이 나오는 문제를 방지한다.
3. 권한, 정책, 상태 전이 제약을 UI 레벨에서도 명확히 적용한다.
4. 디자이너, 프론트엔드 개발자, 백엔드 개발자가 같은 상태 모델을 공유하게 한다.

## 2. 적용 범위

본 문서는 아래 객체의 상태 표현과 액션 매핑에 적용된다.

- Pull Request
- PR 위험도 분석
- Conflict Case
- Backout / Revert
- Policy Template
- Policy Assignment
- Job
- Notification

## 3. 공통 UI 원칙

### 3.1 배지 표현 원칙

1. 상태 배지는 한눈에 현재 상황을 읽게 하는 1차 신호다.
2. 배지는 색상만으로 의미를 전달하지 않고 텍스트 라벨을 반드시 포함한다.
3. 같은 의미의 상태는 화면이 달라도 같은 색 체계를 사용한다.
4. 보조 설명이 필요한 상태는 툴팁 또는 상태 설명 텍스트를 함께 둔다.
5. 위험도와 상태는 분리해서 표시한다. 예를 들어 PR 상태가 approved여도 위험도는 high일 수 있다.

### 3.2 버튼 표현 원칙

1. 한 화면에서 주 액션은 최대 1개만 primary 버튼으로 표시한다.
2. secondary 버튼은 최대 2개까지 노출한다.
3. destructive 성격의 액션은 위험 구역으로 분리한다.
4. 현재 상태에서 허용되지 않는 버튼은 숨기거나 disabled 처리하되, 이유를 설명해야 한다.
5. 권한이 없어서 실행할 수 없는 경우는 disabled보다 숨김을 우선하되, 사용자가 맥락상 필요할 때는 잠금 아이콘과 툴팁으로 노출할 수 있다.

### 3.3 버튼 유형 정의

- Primary: 지금 가장 추천되는 다음 행동
- Secondary: 자주 쓰는 보조 행동
- Tertiary / Text: 보조 링크성 액션
- Destructive: 취소, 종료, 삭제, 중단, revoke 등
- Disabled: 표시하되 현재 실행 불가
- Hidden: 역할 또는 맥락상 불필요

### 3.4 상태 표기 형식

상태 영역은 아래 순서를 기본으로 사용한다.

1. 객체 상태 배지
2. 위험도 배지 또는 추가 상태 배지
3. 한 줄 해석 문장
4. 주 액션 버튼
5. 보조 액션 버튼
6. 차단 사유 또는 주의 문구

예시:

```text
[Approved] [High Risk]
필수 승인은 완료되었지만 테스트 누락으로 아직 병합할 수 없습니다.
[체크 재실행] [충돌 보기] [정책 위반 확인]
```

## 4. 공통 배지 체계

### 4.1 색상 의미

- 회색: 초안, 비활성, 종료, 만료, 보관
- 파랑: 진행 중, 검토 중, 처리 중
- 초록: 승인, 준비 완료, 성공, 활성
- 주황: 사용자 조치 필요, 검토 필요, 부분 완료
- 빨강: 차단, 실패, 정책 위반, 고위험
- 보라: queue, 대기열, 특수 운영 상태

### 4.2 배지 스타일 토큰

프론트엔드 공통 컴포넌트에서 아래 토큰명을 권장한다.

- badge-neutral
- badge-info
- badge-success
- badge-warning
- badge-danger
- badge-queue

## 5. Pull Request 상태 매핑

### 5.1 상태 배지 매핑

| PR 상태 | 표시 라벨 | 배지 톤 | 보조 설명 |
|---|---|---|---|
| draft | Draft | 회색 | 리뷰 준비 전 |
| open | Open | 파랑 | 오픈됨 |
| under-review | In Review | 파랑 | 리뷰 진행 중 |
| changes-requested | Changes Requested | 주황 | 수정 필요 |
| approved | Approved | 초록 | 승인 조건 충족 |
| merge-blocked | Merge Blocked | 빨강 | 병합 차단 |
| ready-to-merge | Ready to Merge | 초록 | 병합 가능 |
| queued-for-merge | In Merge Queue | 보라 | merge queue 대기 |
| merged | Merged | 초록 | 병합 완료 |
| closed | Closed | 회색 | 병합 없이 종료 |
| reverted | Reverted | 빨강 | 병합 후 되돌려짐 |

### 5.2 위험도 배지 매핑

| 위험도 | 표시 라벨 | 배지 톤 |
|---|---|---|
| low | Low Risk | 회색 |
| medium | Medium Risk | 파랑 |
| high | High Risk | 주황 |
| critical | Critical Risk | 빨강 |

### 5.3 PR 상세 화면 버튼 매핑

#### draft

- Primary: Ready for Review
- Secondary: Edit PR
- Secondary: Close PR
- Tertiary: View checklist

노출 규칙:
- 작성자만 Ready for Review 가능
- 리뷰어에게는 Edit PR 숨김

#### open

- Primary: Request Review
- Secondary: Edit PR
- Secondary: View Risk Analysis
- Tertiary: Open in GitHub

조건:
- 리뷰어가 아직 없으면 Request Review를 primary로 강조
- 이미 리뷰어가 있으면 View Risk Analysis를 primary로 대체 가능

#### under-review

- Primary:
  - 작성자 기준: View Review Status
  - 리뷰어 기준: Submit Review
- Secondary: View Risk Analysis
- Secondary: View Changed Files
- Tertiary: Open in GitHub

#### changes-requested

- Primary:
  - 작성자 기준: Address Requested Changes
- Secondary: View Review Comments
- Secondary: Re-run Analysis
- Destructive: Close PR

조건:
- 수정 커밋이 push된 후에는 Primary를 Request Re-review로 변경 가능

#### approved

- Primary:
  - 조건 충족 시: Merge Now 또는 Queue for Merge
  - 조건 미충족 시: Resolve Blocking Issues
- Secondary: View Checks
- Secondary: View Policy Status
- Tertiary: View Build Results

#### merge-blocked

- Primary:
  - 차단 사유가 체크 실패면: Re-run Checks
  - 차단 사유가 충돌이면: Resolve Conflicts
  - 차단 사유가 정책이면: View Policy Violations
- Secondary: View Risk Analysis
- Secondary: Ask for Help
- Tertiary: Open in GitHub

차단 사유 표기 예시:
- 필수 테스트 실패
- merge queue 필수 브랜치
- base branch 오래됨
- CODEOWNERS 승인 누락
- 병합 충돌 존재

#### ready-to-merge

- Primary:
  - queue 사용 브랜치면: Queue for Merge
  - queue 미사용이면: Merge Now
- Secondary: View Checks
- Secondary: View Release Impact
- Tertiary: Open in GitHub

#### queued-for-merge

- Primary: View Queue Status
- Secondary: Leave Queue
- Secondary: View Checks
- Tertiary: Open in GitHub

조건:
- Leave Queue는 작성자 또는 운영 권한자만 표시
- Leave Queue가 정책상 금지되면 disabled + 툴팁 표시

#### merged

- Primary:
  - backout 가능 시: Start Backout
- Secondary: View Merge Commit
- Secondary: View Release Sync Status
- Tertiary: Open in GitHub

조건:
- Start Backout은 정책상 허용 브랜치에서만 노출
- 이미 backout 진행 중이면 View Backout으로 대체

#### closed

- Primary:
  - 재오픈 가능 시: Reopen PR
- Secondary: View Timeline
- Tertiary: Open in GitHub

#### reverted

- Primary: View Backout
- Secondary: View Original PR
- Secondary: View Follow-up Changes

### 5.4 PR 목록 화면 행동 매핑

목록에서는 버튼을 최소화한다.

| 상태 | 인라인 액션 |
|---|---|
| draft | 편집, 상세 보기 |
| under-review | 리뷰하기, 상세 보기 |
| changes-requested | 수정 필요 보기 |
| merge-blocked | 차단 사유 보기 |
| ready-to-merge | queue 또는 merge |
| merged | backout 시작 또는 backout 보기 |

## 6. PR 위험도 분석 상태 매핑

### 6.1 배지 매핑

| 분석 상태 | 표시 라벨 | 배지 톤 |
|---|---|---|
| not-requested | Not Analyzed | 회색 |
| queued | Analysis Queued | 파랑 |
| running | Analysis Running | 파랑 |
| succeeded | Analysis Ready | 초록 |
| partial | Partial Result | 주황 |
| failed | Analysis Failed | 빨강 |
| stale | Analysis Stale | 주황 |

### 6.2 버튼 매핑

| 상태 | Primary | Secondary | 비고 |
|---|---|---|---|
| not-requested | Run Analysis | - | 수동 실행 가능 시 |
| queued | View Job Status | Cancel Job | 권한자만 Cancel |
| running | View Job Status | Cancel Job | |
| succeeded | View Analysis | Re-run Analysis | |
| partial | View Partial Result | Re-run Analysis | |
| failed | Retry Analysis | View Error Detail | |
| stale | Refresh Analysis | View Previous Result | |

## 7. Conflict Case 상태 매핑

### 7.1 배지 매핑

| Conflict 상태 | 표시 라벨 | 배지 톤 |
|---|---|---|
| detected | Conflict Detected | 주황 |
| analyzing | Analyzing Conflict | 파랑 |
| guided | Guidance Ready | 초록 |
| user-working | Resolving | 파랑 |
| resolved | Resolved | 초록 |
| aborted | Aborted | 회색 |
| stale | Stale Guidance | 주황 |

### 7.2 유형 배지 매핑

| Conflict 유형 | 표시 라벨 | 배지 톤 |
|---|---|---|
| merge | Merge Conflict | 빨강 |
| rebase | Rebase Conflict | 빨강 |
| cherry-pick | Cherry-pick Conflict | 빨강 |
| modify-delete | Modify/Delete Conflict | 주황 |
| rename | Rename Conflict | 주황 |

### 7.3 Conflict 상세 화면 버튼 매핑

#### detected

- Primary: Analyze Conflict
- Secondary: View Related Branch
- Secondary: Ask for Help

#### analyzing

- Primary: View Job Status
- Secondary: Cancel Analysis

#### guided

- Primary: Start Resolution
- Secondary: View Git Concept Guide
- Secondary: Escalate to Owner Team
- Tertiary: Open Related PR

#### user-working

- Primary: Mark as Resolved
- Secondary: View Recovery Guide
- Secondary: Abort Operation
- Tertiary: Ask for Help

#### resolved

- Primary: View Validation Result
- Secondary: Reopen Conflict Case
- Tertiary: Open Related PR

#### aborted

- Primary: View Abort Guide
- Secondary: Restart Analysis
- Tertiary: Open Related Branch

#### stale

- Primary: Re-analyze
- Secondary: View Previous Guidance
- Secondary: Open Updated Context

### 7.4 차단/경고 메시지 매핑

| 조건 | UI 처리 |
|---|---|
| generated file 포함 | 주황 경고 박스 |
| release branch 관련 | 빨강 경고 박스 |
| owner team 없음 | 회색 정보 박스 |
| hotspot score 높음 | 주황 강조 |
| base branch 갱신됨 | stale 안내 배너 |

## 8. Backout / Revert 상태 매핑

### 8.1 배지 매핑

| Backout 상태 | 표시 라벨 | 배지 톤 |
|---|---|---|
| draft | Draft | 회색 |
| validating | Validating | 파랑 |
| pending-approval | Approval Required | 주황 |
| approved | Approved | 초록 |
| blocked | Blocked | 빨강 |
| ready | Ready | 초록 |
| pr-generating | Generating Revert PR | 파랑 |
| pr-open | Revert PR Open | 파랑 |
| queued-for-merge | Revert In Queue | 보라 |
| merged | Backout Completed | 초록 |
| failed | Backout Failed | 빨강 |
| cancelled | Cancelled | 회색 |

### 8.2 긴급도 배지 매핑

| 긴급도 | 표시 라벨 | 배지 톤 |
|---|---|---|
| normal | Normal | 회색 |
| high | High | 주황 |
| emergency | Emergency | 빨강 |

### 8.3 Backout Center 목록 인라인 액션

| 상태 | 인라인 액션 |
|---|---|
| draft | 계속 작성, 취소 |
| validating | 상태 보기 |
| pending-approval | 승인 요청 다시 보내기, 상세 보기 |
| approved | 상세 보기 |
| blocked | 차단 사유 보기, 수정 |
| ready | revert PR 생성 |
| pr-open | PR 보기, 상태 보기 |
| queued-for-merge | queue 보기 |
| merged | 결과 보기 |
| failed | 재시도, 오류 보기 |
| cancelled | 상세 보기 |

### 8.4 Backout 상세 화면 버튼 매핑

#### draft

- Primary: Start Validation
- Secondary: Edit Reason
- Destructive: Cancel Backout

#### validating

- Primary: View Validation Status
- Secondary: Cancel Backout

#### pending-approval

- Primary:
  - 승인자 기준: Approve Backout
  - 요청자 기준: View Approval Status
- Secondary: Edit Reason
- Secondary: Re-send Approval Request
- Destructive: Cancel Backout

조건:
- 승인권자만 Approve Backout 노출
- 승인 거절은 destructive 보조 액션으로 노출 가능

#### approved

- Primary: Prepare Revert PR
- Secondary: View Validation Summary
- Secondary: View Impact Analysis

#### blocked

- Primary:
  - 원인별로 다르게 표시
  - 예: Resolve Missing Approval, Fix Policy Issue, Review Conflict Risk
- Secondary: Re-run Validation
- Secondary: Request Exception
- Destructive: Cancel Backout

차단 사유 예시:
- 승인자 누락
- release branch 정책 미충족
- 충돌 위험 높음
- 원본 PR 이미 부분 revert됨
- 권한 없음

#### ready

- Primary: Generate Revert PR
- Secondary: View Revert Preview
- Secondary: View Validation Summary
- Destructive: Cancel Backout

#### pr-generating

- Primary: View Job Status
- Secondary: Cancel Generation

#### pr-open

- Primary:
  - queue 사용 브랜치면: Queue Revert PR
  - queue 미사용이면: Open Revert PR
- Secondary: View Revert PR
- Secondary: View Validation Checklist
- Destructive: Cancel Backout

설명:
- Open Revert PR는 GitHub 화면으로 이동 또는 내부 상세 보기
- 실제 병합은 권한/정책에 따라 GitHub에서 수행될 수 있음

#### queued-for-merge

- Primary: View Queue Status
- Secondary: View Revert PR
- Secondary: Notify Stakeholders

#### merged

- Primary: View Backout Result
- Secondary: View Original PR
- Secondary: View Release Sync Status

#### failed

- Primary: Retry Generation
- Secondary: View Error Detail
- Secondary: Ask for Help
- Destructive: Cancel Backout

#### cancelled

- Primary: Duplicate as New Backout
- Secondary: View Audit Trail

## 9. Policy Template 상태 매핑

### 9.1 배지 매핑

| 상태 | 표시 라벨 | 배지 톤 |
|---|---|---|
| draft | Draft | 회색 |
| active | Active | 초록 |
| deprecated | Deprecated | 주황 |
| archived | Archived | 회색 |

### 9.2 버튼 매핑

#### draft

- Primary: Publish Template
- Secondary: Edit Template
- Destructive: Archive Template

#### active

- Primary: Edit Template
- Secondary: Deprecate Template
- Secondary: View Assignments

#### deprecated

- Primary: Reactivate Template
- Secondary: Archive Template
- Secondary: View Existing Assignments

#### archived

- Primary: Restore Template
- Secondary: View Audit Log

## 10. Policy Assignment 상태 매핑

### 10.1 배지 매핑

| 상태 | 표시 라벨 | 배지 톤 |
|---|---|---|
| pending | Pending | 회색 |
| applying | Applying | 파랑 |
| active | Active | 초록 |
| failed | Apply Failed | 빨강 |
| revoked | Revoked | 회색 |

### 10.2 버튼 매핑

| 상태 | Primary | Secondary |
|---|---|---|
| pending | Start Apply | Cancel |
| applying | View Apply Status | - |
| active | View Effective Rules | Revoke Assignment |
| failed | Retry Apply | View Error Detail |
| revoked | Reapply Assignment | View Audit Log |

## 11. Job 상태 매핑

### 11.1 배지 매핑

| 상태 | 표시 라벨 | 배지 톤 |
|---|---|---|
| queued | Queued | 파랑 |
| running | Running | 파랑 |
| succeeded | Succeeded | 초록 |
| failed | Failed | 빨강 |
| cancelled | Cancelled | 회색 |
| expired | Expired | 회색 |

### 11.2 버튼 매핑

| 상태 | Primary | Secondary |
|---|---|---|
| queued | View Progress | Cancel Job |
| running | View Progress | Cancel Job |
| succeeded | View Result | Re-run Job |
| failed | Retry Job | View Logs |
| cancelled | Re-run Job | View Logs |
| expired | Create New Job | View History |

## 12. Notification 상태 매핑

### 12.1 배지 매핑

| 상태 | 표시 라벨 | 배지 톤 |
|---|---|---|
| pending | Pending | 회색 |
| sending | Sending | 파랑 |
| delivered | Delivered | 초록 |
| failed | Failed | 빨강 |
| acknowledged | Acknowledged | 회색 |
| suppressed | Suppressed | 회색 |

### 12.2 버튼 매핑

| 상태 | Primary | Secondary |
|---|---|---|
| pending | View Detail | Cancel Notification |
| sending | View Detail | - |
| delivered | Open Related Item | Mark Acknowledged |
| failed | Retry Delivery | View Error Detail |
| acknowledged | Open Related Item | - |
| suppressed | View Suppression Reason | - |

## 13. 권한 기반 버튼 가시성 규칙

### 13.1 일반 개발자

보여줄 수 있는 액션:
- PR 편집, 리뷰 요청, 수정 반영, 위험도 보기
- Conflict 분석 보기, 해결 시작, 중단
- Backout 요청 생성, 사유 수정, 취소
- 개인 관련 알림 확인

숨기거나 제한할 액션:
- release backout 승인
- 정책 Publish / Revoke
- 조직 전체 재분석 강제 실행

### 13.2 리뷰어

추가 허용:
- Submit Review
- Approve Backout (승인권자일 경우)
- 리뷰 관련 재분석 요청

### 13.3 운영자 / 관리자

추가 허용:
- 정책 게시 및 배포
- queue 강제 해제
- 예외 승인
- 시스템 Job 재시도
- release backout 승인

## 14. Disabled와 Hidden 처리 기준

| 상황 | 처리 기준 |
|---|---|
| 사용자가 역할상 절대 실행할 수 없음 | Hidden |
| 특정 상태가 아니라서 지금만 실행 불가 | Disabled + 툴팁 |
| 정책상 조건 부족 | Disabled + 차단 사유 표시 |
| 외부 시스템 처리 중 | Disabled + 스피너 또는 진행 문구 |
| 위험한 파괴적 액션 | 노출하되 별도 확인 모달 |

예시:
- Queue for Merge 버튼은 ready-to-merge 상태가 아니면 disabled
- Approve Backout은 승인권자가 아니면 hidden
- Cancel Generation은 pr-generating 상태에서만 노출

## 15. Empty / Loading / Error 상태 규칙

### 15.1 Empty 상태

- PR 없음: "조건에 맞는 PR이 없습니다"
- 충돌 없음: "현재 열린 충돌 사례가 없습니다"
- Backout 없음: "최근 Backout 요청이 없습니다"

액션:
- 필터 초기화
- 새 요청 생성
- 가이드 보기

### 15.2 Loading 상태

- 리스트: skeleton row 5개
- 상세: 요약 카드 skeleton + 우측 액션 skeleton
- 그래프: placeholder + 로딩 문구

### 15.3 Error 상태

오류 박스에는 아래를 포함한다.

1. 사람 친화적 메시지
2. 기술 세부 코드
3. 재시도 버튼
4. 관련 로그 또는 지원 요청 링크

예시:
- "PR 위험도 분석을 불러오지 못했습니다"
- 코드: PR_ANALYSIS_FETCH_FAILED
- [다시 시도] [오류 상세 보기]

## 16. 추천 컴포넌트 구조

### 16.1 상태 배지 컴포넌트

공통 props 예시:

- entityType
- state
- severity
- tooltip
- compact
- iconVisible

### 16.2 액션 패널 컴포넌트

공통 props 예시:

- entityType
- state
- permissions
- blockers
- recommendedActions
- onAction

### 16.3 차단 사유 컴포넌트

표시 요소:
- 차단 제목
- 상세 설명
- 해결 가능한 액션
- 관련 문서 링크

## 17. 구현 우선순위

MVP에서 먼저 컴포넌트화해야 하는 대상은 아래와 같다.

1. PR 상태 배지 + 위험도 배지
2. PR 상세 액션 패널
3. Conflict 상태 배지 + 해결 액션 패널
4. Backout 상태 배지 + 액션 패널
5. 공통 Error / Empty / Loading 상태
6. Disabled 툴팁과 차단 사유 컴포넌트

## 18. QA 체크리스트

1. 같은 상태가 다른 화면에서 같은 라벨과 색을 사용하는가
2. Primary 버튼이 상태에 맞게 1개만 노출되는가
3. 권한이 없는 액션이 숨김 또는 disabled로 올바르게 처리되는가
4. 차단 상태에서 이유가 반드시 보이는가
5. 파괴적 액션에 확인 모달이 있는가
6. stale 상태가 과거 결과로 오해되지 않게 충분히 설명되는가
7. Backout 관련 액션이 일반 PR 액션과 혼동되지 않는가
8. 상태가 빠르게 바뀌는 Job/Queue 화면에서 깜빡임 없이 갱신되는가

## 19. 다음 단계 권장

이 문서 다음 단계로는 아래를 권장한다.

1. 디자인 시스템용 상태 배지 컴포넌트 명세 작성
2. 액션 패널을 React props 인터페이스로 구체화
3. 상태별 스냅샷 테스트 케이스 작성
4. 권한별 UI 회귀 테스트 시나리오 작성
5. Storybook 예제 페이지 구성
