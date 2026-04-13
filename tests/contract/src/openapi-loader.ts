import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

export const OPENAPI_PATH = resolve(process.cwd(), '../../docs/03-api/openapi.yaml');

export interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, unknown>;
  components: {
    schemas: Record<string, Record<string, unknown>>;
  };
}

let cached: OpenApiDocument | null = null;

export function loadOpenApi(): OpenApiDocument {
  if (cached) return cached;
  const raw = readFileSync(OPENAPI_PATH, 'utf8');
  cached = parseYaml(raw) as OpenApiDocument;
  return cached;
}
