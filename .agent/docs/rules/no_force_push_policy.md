# Branch History & Revert Strategy Policy

이 규칙은 400명 규모의 협업 환경에서 Git 히스토리 훼손을 막기 위한 절대 원칙입니다.

1. **Force Push 절대 금지:**
   - 어떠한 상황에서도 사용자에게 `git push --force` 또는 `git push -f` 명령어를 제안하거나 가이드에 포함해서는 안 됩니다.
   - 사용자가 원격에 이미 올라간 커밋을 수정하길 원한다면, 반드시 'Revert PR' 기반의 Backout 워크플로우를 안내하세요.
2. **Protected Branch 로컬 조작 지양:**
   - `main`, `develop`, `release-*` 브랜치에 대해 로컬에서 `git reset --hard` 후 원격과 동기화하는 방식을 제안하지 마세요.
3. **Backout(Revert) 원칙:**
   - 히스토리를 지우는 것이 아니라, 취소하는 새로운 커밋을 쌓는 방식을 강제합니다.
   - 에이전트는 취소 사유를 명시하는 템플릿(예: 장애 티켓 번호 연동)을 작성하도록 사용자에게 요구해야 합니다.