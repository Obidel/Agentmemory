// Plan & pricing configuration. In production, the Polar product IDs come from
// https://polar.sh/agentmemory dashboard. Local dev uses stub IDs so the UI
// remains interactive without a real Polar account.

import { PlanType } from '../types';

export interface PlanConfig {
  id: PlanType;
  name: string;
  price: number;
  period: 'month' | 'forever';
  description: string;
  polarProductId: string;
  limits: {
    memories: number;
    projects: number;
  };
  features: string[];
  highlight?: boolean;
}

export const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Open-source local MCP server with all core features',
    polarProductId: '',
    limits: { memories: 50, projects: 1 },
    features: [
      '50 memories',
      '1 project',
      'All export formats',
      'Semantic search',
      'Graph visualization',
      'Local MCP server',
    ],
  },
  {
    id: 'solo',
    name: 'Solo',
    price: 10,
    period: 'month',
    description: 'Cloud sync, real embeddings, cross-device memory',
    polarProductId: 'ded0b06e-fd6a-4ff9-a5fa-f7c06eee2e2b',
    limits: { memories: Infinity, projects: 10 },
    features: [
      'Unlimited memories',
      '10 projects',
      'Cloud sync across devices',
      'Real AI embeddings (OpenAI/Voyage)',
      'Priority support',
      'Hosted MCP server',
    ],
    highlight: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: 25,
    period: 'month',
    description: 'Shared projects, roles, audit log for engineering teams',
    polarProductId: 'f1c73b11-a0a7-44c6-ba85-0341978aecf2',
    limits: { memories: Infinity, projects: Infinity },
    features: [
      'Everything in Solo',
      'Unlimited projects',
      'Shared team memory',
      'Roles & permissions',
      'API access',
      'Admin dashboard',
      'SSO (SAML)',
    ],
  },
];

export function getPlan(id: PlanType): PlanConfig {
  return PLANS.find(p => p.id === id) ?? PLANS[0];
}
