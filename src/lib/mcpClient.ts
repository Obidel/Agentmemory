import { supabase, supabaseEnabled } from './supabase';

const MCP_URL =
  (import.meta.env.VITE_MCP_URL as string | undefined) ||
  'https://agentmemory-dusky.vercel.app/mcp';

export interface McpToolResult {
  result?: {
    content: Array<{ type: string; text?: string }>;
    isError?: boolean;
  };
  error?: { code: number; message: string };
}

export function mcpUrl(): string {
  return MCP_URL;
}

export function mcpEnabled(): boolean {
  return supabaseEnabled;
}

let nextId = 1;

export async function callMcpTool(name: string, args: Record<string, unknown> = {}): Promise<McpToolResult> {
  if (!supabaseEnabled || !supabase) {
    throw new Error('Supabase is not configured. Sign-in is disabled in local-only mode.');
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not signed in. Visit /auth to sign in first.');
  }

  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: nextId++,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`MCP ${res.status}: ${body.slice(0, 200)}`);
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/event-stream')) {
    const text = await res.text();
    let dataPayload = '';
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) dataPayload += line.slice(6);
    }
    if (!dataPayload) throw new Error('MCP returned empty SSE stream');
    return JSON.parse(dataPayload) as McpToolResult;
  }
  return res.json() as Promise<McpToolResult>;
}

export function extractText(result: McpToolResult): { text: string; isError: boolean } {
  if (result.error) {
    return { text: `MCP error ${result.error.code}: ${result.error.message}`, isError: true };
  }
  const parts = result.result?.content ?? [];
  const text = parts
    .filter(p => p.type === 'text' && p.text)
    .map(p => p.text!)
    .join('\n');
  return { text, isError: result.result?.isError === true };
}
