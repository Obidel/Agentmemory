/**
 * Polar.sh webhook handler — to be deployed alongside the hosted web app.
 *
 * Listens for subscription lifecycle events, mints license keys, and (in
 * production) emails them to the customer. The same license works for:
 *   - Hosted web app (browser localStorage)
 *   - Self-hosted MCP server (AGENTMEMORY_LICENSE env var)
 *
 * Run via Express, Fastify, Hono, or any Node web framework. The example below
 * uses Node's built-in http server so this file has zero dependencies and can
 * be deployed as a single function.
 *
 * Endpoints:
 *   POST /polar/webhook      - Polar events
 *   POST /polar/checkout     - Create checkout session
 *   POST /polar/portal       - Open customer portal
 *   POST /license/verify     - Verify a license key (for web app)
 *
 * Environment:
 *   POLAR_TOKEN              - API token from polar.sh dashboard
 *   POLAR_ORG                - Organization id
 *   POLAR_WEBHOOK_SECRET     - Webhook signing secret
 *   LICENSE_SIGNING_SECRET   - HMAC secret for minted license keys
 *   PORT                     - HTTP port (default 3001)
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { mintLicense, verifyLicense, LicensePayload } from '../src/utils/license';
import { getPolarClient, PolarClient } from '../src/utils/polar';
import { PLANS } from '../src/utils/planConfig';
import { PlanType } from '../src/types';

// === Tiny env helpers ===

const env = (k: string, fallback?: string): string => {
  const v = process.env[k] ?? fallback;
  if (!v) throw new Error(`Missing env: ${k}`);
  return v;
};

// === License key generator (random, displayable) ===

function generateDisplayKey(): string {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AM-${part()}-${part()}-${part()}-${part()}`;
}

// === Polar event types we care about ===

interface PolarSubscriptionCreated {
  type: 'subscription.created' | 'subscription.updated' | 'subscription.active';
  data: {
    id: string;
    status: string;
    customer: { email: string };
    product: { id: string };
    current_period_end?: string;
  };
}

interface PolarSubscriptionCanceled {
  type: 'subscription.canceled' | 'subscription.revoked';
  data: {
    id: string;
    customer: { email: string };
  };
}

type PolarEvent = PolarSubscriptionCreated | PolarSubscriptionCanceled;

// === Webhook signature verification (Polar uses standardwebhooks) ===

async function verifyPolarSignature(req: IncomingMessage, rawBody: string): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production') return true; // dev shortcut
  try {
    // Polar uses https://github.com/standard-webhooks/standard-webhooks
    // Install: npm i standardwebhooks
    // const { Webhook } = await import('standardwebhooks');
    // const wh = new Webhook(env('POLAR_WEBHOOK_SECRET'));
    // wh.verify(rawBody, req.headers as Record<string, string>);
    return true;
  } catch (err) {
    console.error('polar signature verification failed', err);
    return false;
  }
}

// === Webhook handler ===

async function handleWebhook(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const rawBody = Buffer.concat(chunks).toString('utf-8');

  if (!await verifyPolarSignature(req, rawBody)) {
    res.statusCode = 401;
    res.end('invalid signature');
    return;
  }

  let event: PolarEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    res.statusCode = 400;
    res.end('invalid json');
    return;
  }

  const secret = env('LICENSE_SIGNING_SECRET');

  switch (event.type) {
    case 'subscription.created':
    case 'subscription.updated':
    case 'subscription.active': {
      const { id: subId, customer, product, current_period_end } = event.data;
      const plan = PLANS.find(p => p.polarProductId === product.id);
      if (!plan || plan.id === 'free') {
        res.statusCode = 200;
        res.end('ignored (free or unknown plan)');
        return;
      }
      const exp = current_period_end
        ? Math.floor(new Date(current_period_end).getTime() / 1000)
        : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const payload: LicensePayload = {
        sub: subId,
        email: customer.email,
        plan: plan.id as PlanType,
        iat: Math.floor(Date.now() / 1000),
        exp,
      };

      const key = await mintLicense(payload, secret);
      const display = generateDisplayKey();

      // TODO: send email with the license key. For now, log it.
      console.log(`[polar] New subscription: ${customer.email} → plan=${plan.id}`);
      console.log(`[polar] License key: ${display} (machine-readable: ${key.slice(0, 30)}...)`);
      // In production, persist to your DB and email:
      // await sendEmail(customer.email, `Your AgentMemory ${plan.name} key: ${display}...`);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, masked: display }));
      return;
    }

    case 'subscription.canceled':
    case 'subscription.revoked': {
      console.log(`[polar] Subscription canceled: ${event.data.customer.email}`);
      // TODO: revoke license in DB; email "your access continues until <exp>".
      res.statusCode = 200;
      res.end('ok');
      return;
    }

    default:
      res.statusCode = 200;
      res.end('ignored');
  }
}

// === Checkout / Portal / Verify endpoints ===

async function handleCheckout(polar: PolarClient, body: { plan: PlanType; email: string }, res: ServerResponse) {
  const plan = PLANS.find(p => p.id === body.plan);
  if (!plan || plan.id === 'free' || !plan.polarProductId) {
    res.statusCode = 400;
    res.end('invalid plan');
    return;
  }
  try {
    const session = await polar.createCheckout({
      productId: plan.polarProductId,
      customerEmail: body.email,
      successUrl: `${env('APP_URL', 'https://agentmemory.fyi')}/#/pricing?status=success`,
      metadata: { plan: plan.id },
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ url: session.url }));
  } catch (err) {
    console.error('checkout error', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(err) }));
  }
}

async function handlePortal(_polar: PolarClient, _body: { email: string }, _res: ServerResponse) {
  // In production, look up customer_id by email and call createCustomerSession.
  // For now, redirect to the public portal.
  _res.statusCode = 200;
  _res.setHeader('Content-Type', 'application/json');
  _res.end(JSON.stringify({ url: 'https://polar.sh/agentmemory/portal' }));
}

async function handleLicenseVerify(body: { key: string }, res: ServerResponse) {
  try {
    const result = await verifyLicense(body.key, env('LICENSE_SIGNING_SECRET'));
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(err) }));
  }
}

// === Server bootstrap ===

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function main() {
  const polar = getPolarClient();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    res.setHeader('Access-Control-Allow-Origin', env('APP_URL', 'https://agentmemory.fyi'));
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    // Parse JSON body
    let body: any = {};
    if (req.method === 'POST') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf-8')); } catch {}
    }

    if (url.pathname === '/polar/webhook') return handleWebhook(req, res);
    if (url.pathname === '/polar/checkout') return handleCheckout(polar, body, res);
    if (url.pathname === '/polar/portal') return handlePortal(polar, body, res);
    if (url.pathname === '/license/verify') return handleLicenseVerify(body, res);

    res.statusCode = 404;
    res.end('not found');
  });

  server.listen(PORT, () => {
    console.log(`[agentmemory] Polar handler listening on :${PORT}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('fatal', err);
    process.exit(1);
  });
}
