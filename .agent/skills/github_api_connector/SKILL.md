---
name: github_api_connector
description: GitHub Enterprise의 REST 및 GraphQL API를 호출하여 저장소, PR, 커밋, Checks 상태 데이터를 가져오거나 업데이트합니다.
---

tools:
  - name: fetch_pr_details
    description: 특정 PR의 파일 변경 목록, 리뷰 상태, CI/CD Check 통과 여부를 가져옵니다.
    inputs:
      - pr_number: integer
      - repo_name: string
  - name: check_branch_protection
    description: 대상 브랜치에 걸려있는 강제 푸시 금지, 필수 리뷰어 수 등의 정책을 조회합니다.
    inputs:
      - branch_name: string
  - name: post_pr_comment
    description: 에이전트가 분석한 결과를 PR 코멘트로 안전하게 등록합니다.