import { describe, it, expect } from 'vitest';
import SwaggerParser from '@apidevtools/swagger-parser';
import { OPENAPI_PATH } from './openapi-loader.js';

describe('openapi.yaml', () => {
  it('is a valid OpenAPI 3 document', async () => {
    const api = (await SwaggerParser.validate(OPENAPI_PATH)) as {
      info: { title: string };
      openapi?: string;
    };
    expect(api.info.title).toBeTruthy();
    expect(api.openapi).toMatch(/^3\./);
  });
});
