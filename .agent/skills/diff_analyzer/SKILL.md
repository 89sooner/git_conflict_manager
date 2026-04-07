---
name: diff_analyzer
description: Git Diff 결과를 입력받아 임베디드 아키텍처 관점에서 변경의 의미를 파악하는 파서(Parser)입니다.
---

tools:
  - name: map_files_to_subsystems
    description: 변경된 파일의 디렉토리 경로를 기반으로 영향을 받는 SoC 서브시스템(예: Display, Audio, Power)을 매핑합니다.
  - name: detect_generated_files
    description: 파일 헤더의 주석이나 파일명을 스캔하여 빌드 스크립트에 의해 자동 생성된 파일인지 판별합니다.
  - name: calculate_loc_impact
    description: 단순 추가/삭제 라인 수가 아닌, 함수 서명(Signature)이나 전역 변수 변경 등 로직에 미치는 영향도를 계산합니다.