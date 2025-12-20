import { MCPServer } from '../types';

/**
 * Tool implementation for Remote MCP servers
 * This service proxies requests to any remote MCP server following the JSON-RPC spec.
 */
export const callRemoteMCP = async (server: MCPServer, method: string, params: any): Promise<any> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (server.apiKey) {
        // Many remote MCPs use X-API-Key or Authorization
        headers['X-API-Key'] = server.apiKey;
        headers['Authorization'] = `Bearer ${server.apiKey}`;
    }

    const response = await fetch(server.url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: method,
        params: params
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`MCP Server (${server.name}) Error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(`MCP RPC Error on ${server.name}: ${data.error.message || JSON.stringify(data.error)}`);
    }
    
    return data.result;
  } catch (error: any) {
    console.error(`Failed to call MCP ${server.name} (${method}):`, error);
    throw error;
  }
};
