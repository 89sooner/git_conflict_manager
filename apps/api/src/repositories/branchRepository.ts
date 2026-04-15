import type { BranchSummary, BranchDetail } from '@gsp/shared-types';
import { BaseRepository } from './baseRepository.js';
import { MOCK_BRANCH_DETAILS, MOCK_BRANCHES } from '../data/mockReadModel.js';

export class BranchRepository extends BaseRepository {
  async list(repositoryId: string, kind?: string, stale?: boolean): Promise<BranchSummary[]> {
    let branches = [...(MOCK_BRANCHES[repositoryId] ?? [])];
    if (kind) {
      branches = branches.filter((branch) => branch.kind === kind);
    }
    if (typeof stale === 'boolean') {
      branches = branches.filter((branch) => branch.isStale === stale);
    }
    return branches;
  }

  async findByName(repositoryId: string, branchName: string): Promise<BranchDetail | null> {
    return MOCK_BRANCH_DETAILS[`${repositoryId}::${branchName}`] ?? null;
  }
}
