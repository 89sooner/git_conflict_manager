import { describe, it, expect } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ErrorEnvelope } from '@gsp/shared-types';
import { loadOpenApi } from './openapi-loader.js';

describe('ErrorResponse contract', () => {
  const doc = loadOpenApi();
  const errorSchema = doc.components.schemas.ErrorResponse;
  const errorCodeSchema = doc.components.schemas.ErrorCode;
  const apiMetaSchema = doc.components.schemas.ApiMeta;

  it('requires error and meta at the top level', () => {
    expect(errorSchema.required).toEqual(['error', 'meta']);
  });

  it('requires retryable on the error body', () => {
    const errorProps = (errorSchema as { properties: Record<string, { required?: string[] }> })
      .properties.error;
    expect(errorProps.required).toEqual(expect.arrayContaining(['code', 'message', 'retryable']));
  });

  it('defines userAction and details as optional fields', () => {
    const errorProps = (errorSchema as {
      properties: { error: { properties: Record<string, unknown> } };
    }).properties.error.properties;
    expect(errorProps).toHaveProperty('userAction');
    expect(errorProps).toHaveProperty('details');
  });

  it('exposes meta.requestId and meta.timestamp', () => {
    const props = (apiMetaSchema as { properties: Record<string, unknown> }).properties;
    expect(props).toHaveProperty('requestId');
    expect(props).toHaveProperty('timestamp');
  });

  it('validates a well-formed error envelope against the schema', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    ajv.addSchema(errorCodeSchema, '#/components/schemas/ErrorCode');
    ajv.addSchema(apiMetaSchema, '#/components/schemas/ApiMeta');

    const resolvedErrorSchema = JSON.parse(
      JSON.stringify(errorSchema).replace(
        /"\$ref":"#\/components\/schemas\/ErrorCode"/g,
        '"type":"string"',
      ),
    );
    const validate = ajv.compile(resolvedErrorSchema);

    const envelope: ErrorEnvelope = {
      error: {
        code: 'PR_ANALYSIS_NOT_READY',
        message: 'PR analysis is still running.',
        retryable: true,
        userAction: 'Retry in a moment.',
      },
      meta: {
        requestId: 'req_01JABCDEF',
        timestamp: '2026-04-13T12:00:00Z',
      },
    };

    const ok = validate(envelope);
    expect(validate.errors ?? null).toBeNull();
    expect(ok).toBe(true);
  });
});
