// Polar.sh API client. Polar is an open-source merchant-of-record for developers
// (alternative to Stripe with better DX for SaaS, GitHub-style sponsorships,
// usage-based billing, and built-in customer portal).
//
// Docs: https://docs.polar.sh/api-reference
//
// The free local MCP server is fully functional without Polar — this client is
// only used by the hosted web app for checkout/portal flows.

const POLAR_API = 'https://api.polar.sh/v1';

export interface CheckoutSession {
  id: string;
  url: string;
  expires_at: string;
}

export interface CustomerSession {
  id: string;
  customer_portal_url: string;
}

export class PolarClient {
  private token: string;

  constructor(token: string, _organizationId: string) {
    this.token = token;
  }

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${POLAR_API}${path}`, {
      ...init,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Polar API ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  /** Create a checkout session for a Polar product. */
  async createCheckout(params: {
    productId: string;
    customerEmail: string;
    successUrl: string;
    metadata?: Record<string, string>;
  }): Promise<CheckoutSession> {
    return this.req<CheckoutSession>('/checkouts/custom', {
      method: 'POST',
      body: JSON.stringify({
        product_id: params.productId,
        customer_email: params.customerEmail,
        success_url: params.successUrl,
        payment_processor: 'stripe',
        metadata: params.metadata ?? {},
      }),
    });
  }

  /** Open a customer portal session for self-service subscription management. */
  async createCustomerSession(customerId: string): Promise<CustomerSession> {
    return this.req<CustomerSession>(`/customers/${customerId}/portal`, {
      method: 'POST',
    });
  }

  /** Verify a webhook signature. Polar uses standardwebhooks format. */
  static verifyWebhook(payload: string, _headers: Record<string, string>, _secret: string): unknown {
    // Polar uses standardwebhooks (https://github.com/standard-webhooks/standard-webhooks).
    // In Node: import { Webhook } from 'standardwebhooks' and verify.
    // Implementation note: production code should import the SDK.
    // Here we trust the header in dev; in prod use:
    //   const wh = new Webhook(secret);
    //   wh.verify(payload, headers);
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Implement standardwebhooks verification in production');
    }
    return JSON.parse(payload);
  }
}

let _client: PolarClient | null = null;

export function getPolarClient(): PolarClient {
  if (_client) return _client;
  // Vite injects these at build time. In Node (server/webhook), use process.env.
  const env = (typeof import.meta !== 'undefined' && (import.meta as any).env)
    ? (import.meta as any).env
    : process.env;
  const token = env.VITE_POLAR_TOKEN;
  const org = env.VITE_POLAR_ORG;
  if (!token || !org) {
    throw new Error('Polar credentials missing: set VITE_POLAR_TOKEN and VITE_POLAR_ORG');
  }
  _client = new PolarClient(token, org);
  return _client;
}
