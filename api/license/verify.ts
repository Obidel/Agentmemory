/**
 * Vercel API route: POST /api/license/verify
 * Body: { key: string }
 * Returns: { valid, plan, email?, reason? }
 *
 * Used by the web app to verify a license pasted in the activation form.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyLicense } from '../../src/utils/license';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const { key } = req.body as { key: string };
  if (!key) return res.status(400).json({ error: 'key required' });

  const result = await verifyLicense(key, process.env.LICENSE_SIGNING_SECRET!);
  return res.status(200).json(result);
}
