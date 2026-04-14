import type { BranchSummary, BranchDetail } from '@gsp/shared-types';
import { BaseRepository } from './baseRepository.js';

/**
 * Repository layer for branch data (sourced from core_repositories + webhook events).
 * TODO(Phase 4+): replace stub data with pg query once DB connection is wired.
 */
export class BranchRepository extends BaseRepository {
  async list(repositoryId: string, kind?: string, stale?: boolean): Promise<BranchSummary[]> {
    void repositoryId; void kind; void stale;
    return [];
  }

  async findByName(repositoryId: string, branchName: string): Promise<BranchDetail | null> {
    void repositoryId; void branchName;
    return null;
  }
}
