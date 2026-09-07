import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { GitFlowMcpServer } from './gitflow-mcp.server';

@Controller('mcp')
export class McpController {
  constructor(private readonly gitFlowMcpServer: GitFlowMcpServer) {}

  @Get('sse')
  async sse(@Req() req: Request, @Res() res: Response) {
    const transport = new SSEServerTransport('/api/mcp/messages', res);
    this.gitFlowMcpServer.transport = transport;
    await this.gitFlowMcpServer.server.connect(transport);
  }

  @Post('messages')
  async messages(@Req() req: Request, @Res() res: Response) {
    if (this.gitFlowMcpServer.transport) {
      await this.gitFlowMcpServer.transport.handlePostMessage(req, res);
    } else {
      res.status(400).send('No active MCP connection');
    }
  }
}
