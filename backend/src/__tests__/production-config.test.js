import test from 'node:test';
import assert from 'node:assert/strict';

import { getAllowedBrowserOrigins, resolveAllowedCorsOrigin } from '../config/corsOrigins.js';
import { ConnectionService } from '../connection/ConnectionService.js';

function withEnv(overrides, fn) {
  const previous = {};
  for (const key of Object.keys(overrides)) {
    previous[key] = process.env[key];
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key];
    }
  }

  try {
    return fn();
  } finally {
    for (const key of Object.keys(overrides)) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  }
}

await test('CORS origins are normalized from production env values', () => {
  withEnv({
    ALLOWED_ORIGINS: 'https:// flowfex.vercel.app, https://flowfex.onrender.com/, *',
    FLOWFEX_APP_URL: 'https://flowfex.vercel.app/app',
    FLOWFEX_PUBLIC_ORIGIN: 'https://flowfex.onrender.com',
  }, () => {
    const origins = getAllowedBrowserOrigins();
    assert.ok(origins.includes('https://flowfex.vercel.app'));
    assert.ok(origins.includes('https://flowfex.onrender.com'));
    assert.equal(resolveAllowedCorsOrigin('https://flowfex.vercel.app'), 'https://flowfex.vercel.app');
    assert.equal(resolveAllowedCorsOrigin('https://not-flowfex.example'), null);
  });
});

await test('Flowfex env aliases take precedence over legacy Syniq aliases', () => {
  withEnv({
    BETTER_AUTH_URL: undefined,
    FLOWFEX_PUBLIC_ORIGIN: 'https://flowfex.onrender.com',
    SYNIQ_PUBLIC_ORIGIN: 'https://syniq.onrender.com',
    FLOWFEX_LINK_SECRET: 'flowfex-secret',
    SYNIQ_LINK_SECRET: 'syniq-secret',
  }, () => {
    const service = new ConnectionService({
      registry: { getAllTools: () => [] },
      orchestrator: {},
      sessionManager: {},
    });

    assert.equal(service.publicBaseUrl, 'https://flowfex.onrender.com');
    assert.equal(service.linkSecret, 'flowfex-secret');
  });
});
