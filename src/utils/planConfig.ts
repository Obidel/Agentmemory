// Plan metadata — AgentMemory is 100% free and open source. We keep plan
// information for analytics and to display sponsor recognition, but no
// features are gated. Support the project: https://www.donationalerts.com/r/obidel

import { PlanType } from '../types';

export interface PlanConfig {
  id: PlanType;
  name: string;
  description: string;
  badge?: string;
}

export const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Open Source',
    description: 'Free forever, MIT-licensed, no limits.',
    badge: 'MIT',
  },
  {
    id: 'sponsor',
    name: 'Sponsor',
    description: 'A thank-you to backers who support development.',
    badge: '♥',
  },
];

export function getPlan(id: PlanType): PlanConfig {
  return PLANS.find(p => p.id === id) ?? PLANS[0];
}
