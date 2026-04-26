/**
 * Conflict Guidance Job — Phase 7
 *
 * Generates guidance steps and recovery actions for detected conflict cases.
 * Follows AGENTS.md rule: "worker는 UI 문구를 만들지 않고, guidance step,
 * recovery action, file context, escalation metadata를 저장해야 한다."
 *
 * State transitions:
 *   detected → analyzing → guided (success)
 *   detected → analyzing → detected (failure, retry)
 *   guided → stale (source_context_changed)
 */

import type { ConflictType, ConflictCaseStatus } from '@gsp/shared-types';

export interface GuidanceResult {
  guidance: string[];
  recoveryActions: string[];
  interpretedStatus: string;
  gitConceptHint: string;
}

const GUIDANCE_TEMPLATES: Record<ConflictType, Omit<GuidanceResult, 'interpretedStatus'>> = {
  merge: {
    guidance: [
      '1. `git fetch origin && git merge origin/<base>` 실행',
      '2. 충돌 파일의 `<<<<<<<` 마커를 찾아 수동 해결',
      '3. `git add <resolved files>` → `git commit`',
      '4. CI 체크 통과 확인',
    ],
    recoveryActions: [
      '`git merge --abort` — merge 취소',
      '`git reset --hard HEAD` — working tree 초기화',
    ],
    gitConceptHint:
      'merge 충돌은 두 브랜치가 같은 파일의 같은 부분을 서로 다르게 수정했을 때 발생합니다.',
  },
  rebase: {
    guidance: [
      '1. `git rebase origin/<base>` 실행',
      '2. 각 커밋마다 충돌이 발생할 수 있으므로 순차 해결',
      '3. 충돌 해결 후 `git rebase --continue`',
      '4. 모든 커밋 재적용 완료 후 force push: `git push --force-with-lease`',
    ],
    recoveryActions: [
      '`git rebase --abort` — rebase 취소',
      '`git rebase --skip` — 현재 커밋 건너뛰기 (주의)',
    ],
    gitConceptHint:
      'rebase 충돌은 커밋을 하나씩 base 위로 재적용하는 과정에서 발생합니다.',
  },
  'cherry-pick': {
    guidance: [
      '1. `git cherry-pick <commit-sha>` 실행',
      '2. 충돌 파일 해결',
      '3. `git add <resolved files>` → `git cherry-pick --continue`',
    ],
    recoveryActions: [
      '`git cherry-pick --abort` — cherry-pick 취소',
    ],
    gitConceptHint:
      'cherry-pick 충돌은 특정 커밋을 다른 브랜치에 적용할 때 해당 커밋이 의존하는 컨텍스트가 없을 경우 발생합니다.',
  },
  'modify-delete': {
    guidance: [
      '1. 삭제된 파일이 정말 불필요한지 확인',
      '2. 필요하면 `git checkout <branch> -- <file>`로 복원',
      '3. 불필요하면 `git rm <file>` 후 커밋',
    ],
    recoveryActions: [
      '`git merge --abort` 또는 `git rebase --abort`로 원래 상태 복구',
    ],
    gitConceptHint:
      'modify-delete 충돌은 한 브랜치에서 수정한 파일을 다른 브랜치에서 삭제했을 때 발생합니다.',
  },
  rename: {
    guidance: [
      '1. 양 브랜치에서 파일명 변경 의도를 확인',
      '2. 최종 파일명을 결정하고 내용을 병합',
      '3. 불필요한 파일을 `git rm`으로 제거 후 커밋',
    ],
    recoveryActions: [
      '`git merge --abort` — 원래 상태 복구',
    ],
    gitConceptHint:
      'rename 충돌은 같은 파일을 양 브랜치에서 서로 다른 이름으로 변경했을 때 발생합니다.',
  },
};

/**
 * Generate guidance for a conflict case based on its type.
 * Worker stores the result — never produces UI text directly.
 */
export function buildConflictGuidance(conflictType: ConflictType): GuidanceResult {
  const template = GUIDANCE_TEMPLATES[conflictType];
  return {
    ...template,
    interpretedStatus: '가이드가 준비되었습니다. 아래 단계를 따라 충돌을 해결하세요.',
  };
}

/**
 * Validate whether a status transition is allowed per state_transition_spec.md §6.4.
 */
export function isValidConflictTransition(
  current: ConflictCaseStatus,
  next: ConflictCaseStatus,
): boolean {
  const allowed: Record<ConflictCaseStatus, ConflictCaseStatus[]> = {
    detected: ['analyzing', 'aborted', 'stale'],
    analyzing: ['guided', 'detected', 'aborted', 'stale'],
    guided: ['user-working', 'aborted', 'stale'],
    'user-working': ['resolved', 'aborted', 'stale'],
    resolved: [],
    aborted: [],
    stale: ['detected'],
  };
  return (allowed[current] ?? []).includes(next);
}
