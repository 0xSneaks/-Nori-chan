/**
 * Premium entitlement interface for the Sakura Night Festival mode.
 *
 * STATUS: payments are NOT enabled. No provider, price or checkout flow has been
 * approved by the owner. Nothing in this file charges anyone or verifies a payment.
 *
 * Production rule: premium access must come from a SERVER-verified entitlement
 * (e.g. a signed, short-lived token issued by a backend after the payment
 * provider's webhook confirms the purchase). A client-side flag, localStorage
 * value, query param, or wallet "balance check" done only in the browser must
 * never unlock premium in production.
 *
 * Integration point for later: implement `ServerEntitlementProvider` below once
 * the provider/price/checkout are approved, and swap it into `createEntitlements`.
 */

export type EntitlementSource = 'none' | 'dev-preview' | 'server';

export interface EntitlementStatus {
  /** Whether the festival mode may be played right now. */
  festival: boolean;
  source: EntitlementSource;
  /** Human-readable reason shown in the UI. */
  reason: string;
}

export interface CheckoutResult {
  ok: false;
  reason: string;
}

export interface EntitlementProvider {
  readonly id: string;
  getStatus(): Promise<EntitlementStatus>;
  /** Begin checkout. Must not resolve `ok: true` until a server confirms payment. */
  startCheckout(): Promise<CheckoutResult>;
}

export const PAYMENTS_PENDING_REASON =
  'Payments are not enabled yet — waiting for owner approval of provider, price and checkout.';

/** Default in production: premium locked, checkout unavailable. */
export class PaymentsNotConfiguredProvider implements EntitlementProvider {
  readonly id = 'not-configured';
  async getStatus(): Promise<EntitlementStatus> {
    return { festival: false, source: 'none', reason: PAYMENTS_PENDING_REASON };
  }
  async startCheckout(): Promise<CheckoutResult> {
    return { ok: false, reason: PAYMENTS_PENDING_REASON };
  }
}

/**
 * Local/preview builds only. Unlocks the festival so it can be play-tested.
 * Enabled by the build-time constant __PREMIUM_DEV_PREVIEW__, which vite.config.ts
 * forces to false for Vercel production builds.
 */
export class DevPreviewProvider implements EntitlementProvider {
  readonly id = 'dev-preview';
  async getStatus(): Promise<EntitlementStatus> {
    return { festival: true, source: 'dev-preview', reason: 'Development preview — not a purchase.' };
  }
  async startCheckout(): Promise<CheckoutResult> {
    return { ok: false, reason: 'Dev preview does not process payments.' };
  }
}

/**
 * Placeholder for the approved provider. Intentionally unimplemented.
 * Expected contract once approved:
 *   GET  /api/entitlement   -> { festival: boolean } validated server-side from a session/receipt
 *   POST /api/checkout      -> { url } redirect to the provider's hosted checkout
 *   POST /api/webhook       -> provider webhook, verifies signature, records entitlement
 */
export class ServerEntitlementProvider implements EntitlementProvider {
  readonly id = 'server';
  async getStatus(): Promise<EntitlementStatus> {
    return { festival: false, source: 'none', reason: PAYMENTS_PENDING_REASON };
  }
  async startCheckout(): Promise<CheckoutResult> {
    return { ok: false, reason: PAYMENTS_PENDING_REASON };
  }
}

export function createEntitlements(devPreview: boolean): EntitlementProvider {
  return devPreview ? new DevPreviewProvider() : new PaymentsNotConfiguredProvider();
}
