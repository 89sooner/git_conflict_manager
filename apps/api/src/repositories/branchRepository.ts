import type { BranchSummary, BranchDetail } from '@gsp/shared-types';
import { readRuntimeStore } from '@gsp/runtime-store';
import { BaseRepository } from './baseRepository.js';

export class BranchRepository extends BaseRepository {
  async list(repositoryId: string, kind?: string, stale?: boolean): Promise<BranchSummary[]> {
    let branches = [...(readRuntimeStore().branches[repositoryId] ?? [])];
    if (kind) {
      branches = branches.filter((branch) => branch.kind === kind);
    }
    if (typeof stale === 'boolean') {
      branches = branches.filter((branch) => branch.isStale === stale);
    }
    return branches;
  }

  async findByName(repositoryId: string, branchName: string): Promise<BranchDetail | null> {
    return readRuntimeStore().branchDetails[`${repositoryId}::${branchName}`] ?? null;
  }
}
