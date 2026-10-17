/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';

/**
 * Premium dev preview gate (build-time, never a runtime client flag).
 *
 * Enabled only when:
 *  - running `vite` dev server, OR
 *  - VITE_PREMIUM_DEV_PREVIEW=true AND the build is NOT a Vercel production build.
 *
 * A production deployment (VERCEL_ENV=production) can never ship the preview unlock,
 * even if the env var is set by mistake. Real premium access must come from a
 * server-verified entitlement (see src/premium/entitlements.ts).
 */
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProdDeploy = (process.env.VERCEL_ENV ?? env.VERCEL_ENV) === 'production';
  const wantsPreview = (process.env.VITE_PREMIUM_DEV_PREVIEW ?? env.VITE_PREMIUM_DEV_PREVIEW) === 'true';
  const premiumPreview = command === 'serve' || (wantsPreview && !isProdDeploy);

  return {
    define: {
      __PREMIUM_DEV_PREVIEW__: JSON.stringify(premiumPreview),
    },
    build: {
      target: 'es2020',
      assetsInlineLimit: 4096,
      sourcemap: false,
    },
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  };
});
