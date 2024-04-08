import type {
  ClientContext,
  HandleMessagePlugin,
  HandleMessageResult,
  IncomingMessage,
} from '@nostr-relay/common';
import path from 'path';
import Pino from 'pino';
import { ensureDirSync } from './utils';

export class RequestLogger implements HandleMessagePlugin {
  private readonly logger: Pino.Logger;

  constructor(dirPath: string) {
    ensureDirSync(dirPath);
    this.logger = Pino({
      transport: {
        target: 'pino/file',
        options: { destination: path.join(dirPath, 'requests.log') },
      },
    });
  }

  async handleMessage(
    _ctx: ClientContext,
    [messageType]: IncomingMessage,
    next: () => Promise<HandleMessageResult>,
  ): Promise<HandleMessageResult> {
    const start = Date.now();
    const result = await next();
    this.logger.info(
      { messageType, duration: Date.now() - start },
      `${messageType} request processed in ${Date.now() - start}ms`,
    );
    return result;
  }
}
