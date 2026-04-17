import { beforeEach, describe, expect, it } from 'vitest';
import { resetRuntimeStore } from '@gsp/runtime-store';
import { createServer } from '../src/index.js';
import { signPayload } from '../src/lib/github/verify.js';

const TEST_SECRET = 'test-webhook-secret';

beforeEach(() => {
  process.env.GSP_RUNTIME_STORE_FILE = '/tmp/gsp-api-webhooks-store.json';
  resetRuntimeStore();
});

function makeBody(payload: unknown): Buffer {
  return Buffer.from(JSON.stringify(payload), 'utf-8');
}

function headers(
  body: Buffer,
  eventName: string,
  deliveryId: string,
  secret: string = TEST_SECRET,
) {
  return {
    'content-type': 'application/json',
    'x-github-event': eventName,
    'x-github-delivery': deliveryId,
    'x-hub-signature-256': signPayload(body, secret),
  };
}

describe('POST /webhooks/github', () => {
  it('returns 401 when signature is invalid', async () => {
    const app = createServer({ logger: false, webhookSecret: TEST_SECRET });
    try {
      const body = makeBody({ action: 'opened' });
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/github',
        headers: {
          'content-type': 'application/json',
          'x-github-event': 'pull_request',
          'x-github-delivery': 'delivery-sig-fail',
          'x-hub-signature-256': 'sha256=badhash',
        },
        payload: body,
      });
      expect(response.statusCode).toBe(401);
      const result = response.json() as { error: { code: string } };
      expect(result.error.code).toBe('GITHUB_WEBHOOK_SIGNATURE_INVALID');
    } finally {
      await app.close();
    }
  });

  it('returns 400 when X-GitHub-Delivery is missing', async () => {
    const app = createServer({ logger: false, webhookSecret: TEST_SECRET });
    try {
      const body = makeBody({ action: 'opened' });
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/github',
        headers: {
          'content-type': 'application/json',
          'x-github-event': 'pull_request',
          'x-hub-signature-256': signPayload(body, TEST_SECRET),
        },
        payload: body,
      });
      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it('accepts a valid pull_request event and returns 202', async () => {
    const app = createServer({ logger: false, webhookSecret: TEST_SECRET });
    try {
      const payload = {
        action: 'opened',
        number: 42,
        pull_request: { id: 9001, number: 42 },
        repository: { id: 1111, full_name: 'my-org/my-repo' },
        sender: { id: 5555 },
        installation: { id: 99 },
      };
      const body = makeBody(payload);
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/github',
        headers: headers(body, 'pull_request', 'delivery-pr-1'),
        payload: body,
      });
      expect(response.statusCode).toBe(202);
      const result = response.json() as {
        data: {
          deliveryId: string;
          eventName: string;
          action: string | null;
          status: string;
          syncJobsEnqueued: number;
        };
        meta: { requestId: string; timestamp: string };
      };
      expect(result.data.deliveryId).toBe('delivery-pr-1');
      expect(result.data.eventName).toBe('pull_request');
      expect(result.data.action).toBe('opened');
      expect(result.data.status).toBe('accepted');
      expect(result.data.syncJobsEnqueued).toBe(1);
      expect(result.meta.requestId).toBeTruthy();
    } finally {
      await app.close();
    }
  });

  it('returns 200 duplicate for repeated delivery_id', async () => {
    const app = createServer({ logger: false, webhookSecret: TEST_SECRET });
    try {
      const payload = { action: 'created', installation: { id: 10 } };
      const body = makeBody(payload);
      const hdrs = headers(body, 'installation', 'delivery-dedup-1');

      await app.inject({ method: 'POST', url: '/webhooks/github', headers: hdrs, payload: body });
      const second = await app.inject({
        method: 'POST',
        url: '/webhooks/github',
        headers: hdrs,
        payload: body,
      });
      expect(second.statusCode).toBe(200);
      const result = second.json() as { data: { status: string } };
      expect(result.data.status).toBe('duplicate');
    } finally {
      await app.close();
    }
  });

  it('accepts unknown event types with status=ignored and 202', async () => {
    const app = createServer({ logger: false, webhookSecret: TEST_SECRET });
    try {
      const payload = { action: 'something' };
      const body = makeBody(payload);
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/github',
        headers: headers(body, 'unknown_event_type', 'delivery-unknown-1'),
        payload: body,
      });
      expect(response.statusCode).toBe(202);
      const result = response.json() as { data: { status: string; syncJobsEnqueued: number } };
      expect(result.data.status).toBe('ignored');
      expect(result.data.syncJobsEnqueued).toBe(0);
    } finally {
      await app.close();
    }
  });

  it('accepts a push event and enqueues a branch_sync job', async () => {
    const app = createServer({ logger: false, webhookSecret: TEST_SECRET });
    try {
      const payload = {
        ref: 'refs/heads/main',
        after: 'abc123',
        repository: { id: 2222, full_name: 'my-org/my-repo' },
        sender: { id: 7777 },
        installation: { id: 99 },
      };
      const body = makeBody(payload);
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/github',
        headers: headers(body, 'push', 'delivery-push-1'),
        payload: body,
      });
      expect(response.statusCode).toBe(202);
      const result = response.json() as { data: { syncJobsEnqueued: number } };
      expect(result.data.syncJobsEnqueued).toBe(1);
    } finally {
      await app.close();
    }
  });
});
