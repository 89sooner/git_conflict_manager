---
name: calculate_pr_risk_score
description: PR의 변경 파일 목록과 메타데이터를 분석하여 임베디드 환경에 특화된 위험도 점수(0~100)를 산출합니다.
---

inputs:
  - name: changed_files
    type: list
    description: PR에서 변경된 파일 경로 목록
  - name: target_branch
    type: string
    description: PR이 병합될 대상 브랜치 (예: main, release-2026)
  - name: author_exp_level
    type: string
    description: 작성자의 해당 저장소 기여도 (novice, intermediate, expert)

logic:
  base_score: 10
  weights:
    - condition: "contains 'bootloader/' or 'kernel/' or 'driver/'"
      add: 40
      reason: "핵심 계층(Core Layer) 수정"
    - condition: "multiple subsystems modified (count > 2)"
      add: 20
      reason: "다중 서브시스템 동시 변경에 따른 Side-effect 우려"
    - condition: "target_branch starts with 'release-'"
      add: 30
      reason: "릴리스 브랜치 직접 반영 시도"
    - condition: "author_exp_level == 'novice'"
      add: 10
      reason: "신규 기여자 검토 강화"
    - condition: "no '*test*' files in changed_files"
      add: 15
      reason: "테스트 코드 누락"

output:
  format: JSON
  schema:
    score: integer (0-100)
    risk_level: string (LOW, MEDIUM, HIGH, BLOCK)
    risk_factors: list of reasons