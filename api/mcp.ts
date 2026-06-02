import type { IncomingMessage, ServerResponse } from 'http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from '../mcp/server.js';
import { SupabaseBackend } from '../mcp/backends/supabase.js';

/**
 * Vercel serverless entry point for the MCP server.
 * - POST /api/mcp  → JSON-RPC over HTTP
 * - GET  /api/mcp  → server-sent events (for streaming responses)
 * - DELETE /api/mcp → close session
 *
 * Auth: clients must send `Authorization: Bearer <supabase-jwt>`. The JWT is
 * passed to Supabase as the user's session, so RLS policies enforce that
 * each user only sees/modifies their own memories.
 *
 * Configure on Vercel: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 * (the service role key is unused here but kept for parity with future server
 * utilities like admin reporting).
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Mcp-Session-Id');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // ─── Auth ──────────────────────────────────────────────────────────
  const auth = req.headers['authorization'];
  if (!auth || !auth.toString().startsWith('Bearer ')) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Missing Authorization: Bearer <supabase-jwt>' },
      id: null,
    }));
    return;
  }
  const jwt = auth.toString().slice(7).trim();

  // ─── Config ────────────────────────────────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32002, message: 'Server is missing SUPABASE_URL / SUPABASE_ANON_KEY' },
      id: null,
    }));
    return;
  }

  // ─── Build a one-shot server bound to this user's JWT ──────────────
  const backend = new SupabaseBackend(supabaseUrl, supabaseAnonKey, jwt);
  const server = createServer(backend);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32603, message: err instanceof Error ? err.message : String(err) },
        id: null,
      }));
    }
  } finally {
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
  }
}
