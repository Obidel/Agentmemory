// License verification shared between web app and MCP server.
//
// Flow:
//  1. User buys Solo/Team on polar.sh → Polar webhook hits /api/polar/webhook
//  2. Webhook handler mints a license key (HMAC-signed JWT) and stores it
//  3. User sets AGENTMEMORY_LICENSE env var or pastes the key in web settings
//  4. MCP server / web app verifies the key signature on startup
//
// The key is portable: users can take their license to self-hosted MCP or
// the web app interchangeably.

import { PlanType } from '../types';

const PLAN_RANK: Record<PlanType, number> = {
  free: 0,
  solo: 1,
  team: 2,
};

export interface LicensePayload {
  /** Subscription id from Polar. */
  sub: string;
  /** Customer email. */
  email: string;
  /** Plan tier. */
  plan: PlanType;
  /** Issued at (unix seconds). */
  iat: number;
  /** Expires at (unix seconds). */
  exp: number;
}

export interface LicenseValidation {
  valid: boolean;
  plan: PlanType;
  email?: string;
  reason?: string;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

/** Base64url encode/decode helpers (no padding). */
function b64url(bytes: ArrayBuffer | Uint8Array | string): string {
  const data = typeof bytes === 'string' ? enc.encode(bytes) : new Uint8Array(bytes);
  let bin = '';
  data.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, data: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign', 'verify']
  );
  return crypto.subtle.sign('HMAC', key, enc.encode(data));
}

/** Constant-time string compare. */
function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Mint a license key. Used by the webhook handler when Polar fires
 * subscription.created / subscription.active.
 *
 * Format: base64url(header).base64url(payload).base64url(signature)
 * Header is fixed `{"alg":"HS256","typ":"LIC"}`.
 */
export async function mintLicense(payload: LicensePayload, secret: string): Promise<string> {
  if (!secret) throw new Error('license secret required');
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'LIC' }));
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(await hmac(secret, `${header}.${body}`));
  return `${header}.${body}.${sig}`;
}

/**
 * Verify a license key. Returns the validated payload (or reason for failure).
 * Pure function — no I/O, safe to call on every MCP request.
 */
export async function verifyLicense(key: string | undefined, secret: string): Promise<LicenseValidation> {
  if (!key) {
    return { valid: false, plan: 'free', reason: 'no license key' };
  }
  if (!secret) {
    return { valid: false, plan: 'free', reason: 'no secret configured on server' };
  }

  const parts = key.split('.');
  if (parts.length !== 3) return { valid: false, plan: 'free', reason: 'malformed license' };

  const [header, body, sig] = parts;
  let expected: ArrayBuffer;
  try {
    expected = await hmac(secret, `${header}.${body}`);
  } catch {
    return { valid: false, plan: 'free', reason: 'hmac failed' };
  }
  const sigBytes = b64urlDecode(sig);
  if (!safeEq(b64url(expected), b64url(sigBytes))) {
    return { valid: false, plan: 'free', reason: 'invalid signature' };
  }

  let payload: LicensePayload;
  try {
    payload = JSON.parse(dec.decode(b64urlDecode(body))) as LicensePayload;
  } catch {
    return { valid: false, plan: 'free', reason: 'invalid payload' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    return { valid: false, plan: payload.plan, reason: 'expired' };
  }

  return { valid: true, plan: payload.plan, email: payload.email };
}

/** Check whether a verified license unlocks a given plan tier. */
export function planMeets(actual: PlanType, required: PlanType): boolean {
  return PLAN_RANK[actual] >= PLAN_RANK[required];
}

/** Cached license state — call `loadLicense()` once on startup. */
let cached: LicenseValidation | null = null;
let cachedKey = '';

export function loadLicense(key: string | undefined, secret: string): Promise<LicenseValidation> {
  if (key === cachedKey && cached) return Promise.resolve(cached);
  return verifyLicense(key, secret).then(v => {
    cachedKey = key ?? '';
    cached = v;
    return v;
  });
}
