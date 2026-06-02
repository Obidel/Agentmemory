/**
 * Vercel API route: POST /api/polar/checkout
 * Body: { plan: 'solo' | 'team', email: string }
 * Returns: { url: string } — redirect URL
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PLANS } from '../../src/utils/planConfig';
import { PlanType } from '../../src/types';

const POLAR_API = 'https://api.polar.sh/v1';
const POLAR_TOKEN = process.env.POLAR_TOKEN!;
const APP_URL = process.env.APP_URL || 'https://agentmemory.fyi';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { plan, email } = req.body as { plan: PlanType; email: string };
  const cfg = PLANS.find(p => p.id === plan);
  if (!cfg || plan === 'free' || !cfg.polarProductId) {
    return res.status(400).json({ error: 'invalid plan' });
  }
  if (!email) {
    return res.status(400).json({ error: 'email required' });
  }

  try {
    const polarRes = await fetch(`${POLAR_API}/checkouts/custom`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${POLAR_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: cfg.polarProductId,
        customer_email: email,
        success_url: `${APP_URL}/#/pricing?status=success`,
        payment_processor: 'stripe',
        metadata: { plan },
      }),
    });
    if (!polarRes.ok) {
      const err = await polarRes.text();
      return res.status(polarRes.status).json({ error: err });
    }
    const session = await polarRes.json();
    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
