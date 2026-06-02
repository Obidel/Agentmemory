#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { LocalBackend } from './backends/local.js';

async function main() {
  const backend = new LocalBackend();
  const server = createServer(backend);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const memCount = backend['store']?.memories?.length ?? 0;
  console.error(`AgentMemory MCP server running on stdio (${memCount} memories loaded, free & open source — https://dalink.to/agentmemory)`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
