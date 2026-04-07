---
name: revert_pr_generator
description: 운영 장애 시 원격 저장소의 히스토리를 강제로 덮어쓰지 않고, 안전하게 변경 사항을 되돌리는 Revert PR을 자동 생성합니다.
---

tools:
  - name: check_commit_dependencies
    description: 되돌리려는 커밋(또는 PR) 이후에 해당 코드를 의존하여 작성된 후속 커밋이 있는지 검사하여 충돌 가능성을 예측합니다.
  - name: create_backout_pr
    description: git revert 명령어의 결과를 담은 새로운 브랜치를 생성하고, 원본 PR을 명시한 템플릿과 함께 Backout PR을 엽니다.
    inputs:
      - target_commit_sha: string
      - reason_ticket_url: string