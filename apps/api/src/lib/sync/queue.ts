import type { FastifyBaseLogger } from 'fastify';
import type { SyncJobRequest } from '../github/types.js';

/**
 * Sync job queue — Phase 3 baseline stub.
 *
 * Emits jobs to the logger for now. Replace this with a real queue
 * (pg-backed integration_sync_jobs INSERT or a message broker) once
 * the DB connection and worker are wired in a later phase.
 */
export class SyncJobQueue {
  private readonly logger: FastifyBaseLogger;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger;
  }

  enqueue(job: SyncJobRequest): void {
    this.logger.info(
      {
        component: 'sync-queue',
        jobType: job.jobType,
        triggerType: job.triggerType,
        repoGithubId: job.repoGithubId ?? null,
        orgGithubId: job.orgGithubId ?? null,
        correlationId: job.correlationId,
        parameters: job.parameters ?? null,
      },
      `sync job enqueued: ${job.jobType}`,
    );
  }

  enqueueAll(jobs: SyncJobRequest[]): void {
    for (const job of jobs) {
      this.enqueue(job);
    }
  }
}
