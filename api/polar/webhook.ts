/**
 * Vercel API route: POST /api/polar/webhook
 *
 * Polar.sh sends subscription lifecycle events here. We verify the
 * standardwebhooks signature, mint a license key, and (TODO) email it.
 *
 * File path: /api/polar/webhook.ts  → deployed as /api/polar/webhook
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mintLicense, type LicensePayload } from '../../src/utils/license';
import { PlanType } from '../../src/types';

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET!;
const LICENSE_SIGNING_SECRET = process.env.LICENSE_SIGNING_SECRET!;
const POLAR_PRODUCT_TO_PLAN: Record<string, PlanType> = {
  'ded0b06e-fd6a-4ff9-a5fa-f7c06eee2e2b': 'solo',
  'f1c73b11-a0a7-44c6-ba85-0341978aecf2': 'team',
};

interface PolarEvent {
  type: string;
  data: {
    id: string;
    status: string;
    customer: { email: string };
    product: { id: string };
    current_period_end?: string;
  };
}

async function verifySignature(req: VercelRequest, rawBody: string): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production') return true;
  try {
    const { Webhook } = await import('standardwebhooks');
    const wh = new Webhook(POLAR_WEBHOOK_SECRET);
    wh.verify(rawBody, {
      'webhook-id': req.headers['webhook-id'] as string,
      'webhook-timestamp': req.headers['webhook-timestamp'] as string,
      'webhook-signature': req.headers['webhook-signature'] as string,
    });
    return true;
  } catch (err) {
    console.error('signature verify failed', err);
    return false;
  }
}

function generateDisplayKey(): string {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AM-${part()}-${part()}-${part()}-${part()}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const rawBody = JSON.stringify(req.body);
  if (!await verifySignature(req, rawBody)) {
    return res.status(401).json({ error: 'invalid signature' });
  }

  const event = req.body as PolarEvent;
  const productId = event.data?.product?.id;
  const plan = productId ? POLAR_PRODUCT_TO_PLAN[productId] : undefined;

  switch (event.type) {
    case 'subscription.created':
    case 'subscription.active':
    case 'subscription.updated': {
      if (!plan || plan === 'free') {
        return res.status(200).json({ ignored: 'unknown plan' });
      }

      const exp = event.data.current_period_end
        ? Math.floor(new Date(event.data.current_period_end).getTime() / 1000)
        : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      const payload: LicensePayload = {
        sub: event.data.id,
        email: event.data.customer.email,
        plan,
        iat: Math.floor(Date.now() / 1000),
        exp,
      };

      const license = await mintLicense(payload, LICENSE_SIGNING_SECRET);
      const displayKey = generateDisplayKey();

      // TODO: send via Resend / Postmark
      console.log(`[polar] New ${plan} subscription: ${event.data.customer.email}`);
      console.log(`[polar] License: ${displayKey} (sig: ${license.slice(0, 30)}...)`);

      // Persist to Supabase for later lookup
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        await supabase.from('licenses').upsert({
          email: event.data.customer.email,
          polar_subscription_id: event.data.id,
          plan,
          license_key: license,
          display_key: displayKey,
          expires_at: new Date(exp * 1000).toISOString(),
        });
      } catch (err) {
        console.error('supabase persist failed', err);
      }

      return res.status(200).json({ ok: true, masked: displayKey });
    }

    case 'subscription.canceled':
    case 'subscription.revoked': {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        await supabase
          .from('licenses')
          .update({ revoked_at: new Date().toISOString() })
          .eq('polar_subscription_id', event.data.id);
      } catch (err) {
        console.error('supabase revoke failed', err);
      }
      return res.status(200).json({ ok: true });
    }

    default:
      return res.status(200).json({ ignored: event.type });
  }
}
