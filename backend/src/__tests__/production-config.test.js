import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { getAllowedBrowserOrigins, resolveAllowedCorsOrigin } from '../config/corsOrigins.js';
import { ConnectionService } from '../connection/ConnectionService.js';
import { SyniqServer } from '../server/SyniqServer.js';

async function withEnv(overrides, fn) {
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
    return await fn();
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

await test('CORS origins are normalized from production env values', async () => {
  await withEnv({
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

await test('Flowfex env aliases take precedence over legacy Syniq aliases', async () => {
  await withEnv({
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

await test('legacy /auth paths are rewritten to /api/auth', async () => {
  await withEnv({
    ALLOWED_ORIGINS: 'https://flowfex.vercel.app',
  }, async () => {
    const server = new SyniqServer({
      host: '127.0.0.1',
      port: 0,
      sessionDataEnabled: false,
      connectionService: new ConnectionService({
        registry: { getAllTools: () => [] },
        orchestrator: {},
        sessionManager: {},
      }),
    });

    const address = await server.start();
    try {
      const response = await requestGet(address.port, '/auth/get-session');
      assert.equal(response.statusCode, 200);
    } finally {
      await server.stop();
    }
  });
});

await test('auth preflight returns 204 with credentialed CORS headers', async () => {
  await withEnv({
    ALLOWED_ORIGINS: 'https://flowfex.vercel.app',
  }, async () => {
    const server = new SyniqServer({
      host: '127.0.0.1',
      port: 0,
      sessionDataEnabled: false,
      connectionService: new ConnectionService({
        registry: { getAllTools: () => [] },
        orchestrator: {},
        sessionManager: {},
      }),
    });

    const address = await server.start();
    try {
      const response = await requestOptions(address.port, '/api/auth/sign-in/email', {
        origin: 'https://flowfex.vercel.app',
        requestMethod: 'POST',
        requestHeaders: 'content-type',
      });

      assert.equal(response.statusCode, 204);
      assert.equal(response.headers['access-control-allow-origin'], 'https://flowfex.vercel.app');
      assert.equal(response.headers['access-control-allow-credentials'], 'true');
    } finally {
      await server.stop();
    }
  });
});

function requestOptions(port, path, { origin, requestMethod, requestHeaders }) {
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': requestMethod,
        'Access-Control-Request-Headers': requestHeaders,
      },
    }, (response) => {
      response.resume();
      response.on('end', () => resolve(response));
    });

    request.on('error', reject);
    request.end();
  });
}

function requestGet(port, path) {
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method: 'GET',
    }, (response) => {
      response.resume();
      response.on('end', () => resolve(response));
    });

    request.on('error', reject);
    request.end();
  });
}
