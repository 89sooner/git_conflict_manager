import { createHmac, timingSafeEqual } from 'node:crypto';

const SIG_PREFIX = 'sha256=';

/**
 * Verifies a GitHub webhook HMAC-SHA256 signature.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param rawBody  Raw request body Buffer (must be the unmodified body bytes)
 * @param sigHeader  Value of the X-Hub-Signature-256 header
 * @param secret  The webhook secret configured in GitHub App settings
 * @returns true if the signature is valid
 */
export function verifyGitHubSignature(
  rawBody: Buffer,
  sigHeader: string | undefined,
  secret: string,
): boolean {
  if (!sigHeader || !sigHeader.startsWith(SIG_PREFIX)) return false;

  const expected = SIG_PREFIX + createHmac('sha256', secret).update(rawBody).digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(sigHeader, 'utf8');

  if (expectedBuf.length !== receivedBuf.length) return false;

  try {
    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

/**
 * Generates a test-only webhook signature for use in unit/integration tests.
 */
export function signPayload(rawBody: Buffer, secret: string): string {
  return SIG_PREFIX + createHmac('sha256', secret).update(rawBody).digest('hex');
}
